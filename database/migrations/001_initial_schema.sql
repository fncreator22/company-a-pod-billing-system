-- ============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Core schema for Road Transport POD Management System
-- Reconciled via Google EGM Multi-Lens Audit
-- ============================================================================

-- Enable pgcrypto extension for password hashing and UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- Maps application profiles 1:1 with auth.users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('driver', 'billing_executive')),
    phone TEXT,
    preferred_language TEXT DEFAULT 'en',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. TRIPS
-- Operational freight shipments (Company-owned and Hired vehicles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    goods_description TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    destination TEXT NOT NULL,
    trip_amount NUMERIC(12,2) NOT NULL CHECK (trip_amount >= 0),
    driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for hired vehicles
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('company', 'hired')),
    vendor_name TEXT, -- Transporter/broker for hired trucks
    expected_lr_number TEXT,
    invoice_number TEXT, -- Commercial Invoice / Delivery Challan
    expected_quantity NUMERIC(12,2) CHECK (expected_quantity >= 0),
    quantity_unit TEXT DEFAULT 'units',
    trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
    pod_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. PODS
-- Proof of Delivery capture metadata, review decisions, and public share token
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for hired driver links
    client_upload_id UUID UNIQUE NOT NULL, -- Idempotency key from client capture
    storage_path TEXT NOT NULL,
    image_size_bytes INTEGER NOT NULL CHECK (image_size_bytes > 0 AND image_size_bytes <= 307200), -- <= 300 KB limit
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    capture_time TIMESTAMPTZ NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
    gps_accuracy_meters DOUBLE PRECISION,
    upload_status TEXT NOT NULL CHECK (upload_status IN ('pending_upload', 'uploaded', 'upload_failed')),
    verification_status TEXT NOT NULL CHECK (verification_status IN (
        'pending', 'processing', 'verified', 'approved', 'rejected', 'needs_review', 'retake_requested', 'failed'
    )),
    retake_count INTEGER DEFAULT 0 CHECK (retake_count BETWEEN 0 AND 2),
    attempt_number INTEGER DEFAULT 1 CHECK (attempt_number BETWEEN 1 AND 3),
    reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    corrected_data JSONB DEFAULT NULL, -- Stores human adjustments without overwriting original AI extraction
    share_token UUID UNIQUE DEFAULT gen_random_uuid(),
    share_token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    is_share_token_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. POD VERIFICATIONS
-- Append-only audit log of all AI extraction attempts per attempt number
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pod_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    storage_path TEXT NOT NULL, -- Preserves exact historical photograph from this attempt
    provider TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    model_name TEXT NOT NULL,
    extracted_data JSONB NOT NULL,
    overall_confidence NUMERIC(5,4),
    lr_match BOOLEAN,
    stamp_visible BOOLEAN,
    signature_visible BOOLEAN,
    shortage_detected BOOLEAN DEFAULT FALSE,
    damage_detected BOOLEAN DEFAULT FALSE,
    decision TEXT NOT NULL CHECK (decision IN ('verified', 'retake_requested', 'needs_review', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. BILLING RECORDS
-- Verified deliveries ready for Tally CSV export with duplicate prevention
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    original_amount NUMERIC(12,2) NOT NULL,
    deduction_amount NUMERIC(12,2) DEFAULT 0.00,
    final_billed_amount NUMERIC(12,2) NOT NULL,
    billing_status TEXT NOT NULL CHECK (billing_status IN ('not_ready', 'billing_ready', 'exported')),
    exported_at TIMESTAMPTZ,
    export_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_billing_records_trip UNIQUE (trip_id) -- Eliminates double-billing race condition
);

-- ----------------------------------------------------------------------------
-- 6. UPLOAD TOKENS
-- Scoped, multi-attempt tokens for hired drivers via mock SMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS upload_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    attempt_count INTEGER DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 3),
    max_attempts INTEGER DEFAULT 3,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. INDEXES FOR OPERATIONAL PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_trip_number ON trips(trip_number);
CREATE INDEX IF NOT EXISTS idx_pods_trip_id ON pods(trip_id);
CREATE INDEX IF NOT EXISTS idx_pods_client_upload_id ON pods(client_upload_id);
CREATE INDEX IF NOT EXISTS idx_pods_verification_status ON pods(verification_status);
CREATE INDEX IF NOT EXISTS idx_pod_verifications_pod_id ON pod_verifications(pod_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(billing_status);
CREATE INDEX IF NOT EXISTS idx_upload_tokens_hash ON upload_tokens(token_hash);

-- ----------------------------------------------------------------------------
-- 8. STORAGE BUCKET & ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pod-images', 'pod-images', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;

-- Trips RLS Policies
CREATE POLICY "Billing executives full access to trips" ON trips
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'billing_executive'));

CREATE POLICY "Drivers view assigned trips only" ON trips
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

-- Pods RLS Policies
CREATE POLICY "Billing executives full access to pods" ON pods
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'billing_executive'));

CREATE POLICY "Drivers access own submitted pods" ON pods
  FOR ALL TO authenticated
  USING (submitted_by = auth.uid());
