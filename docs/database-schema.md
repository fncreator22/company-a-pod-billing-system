# Backend and Database Schema Specification
## Road Transport POD Management System

**Version:** 1.1 (Goldfish-Audited & Reconciled via EGM)  
**Status:** Approved Implementation Specification  
**Related documents:** PRD v1.1, Architecture Plan v1.1

---

## 1. Database Schema (PostgreSQL / Supabase DDL)

```sql
-- Enable pgcrypto for password hashing and UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1.1 PROFILES
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('driver', 'billing_executive')),
    phone TEXT,
    preferred_language TEXT DEFAULT 'en',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 TRIPS
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    goods_description TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    destination TEXT NOT NULL,
    trip_amount NUMERIC(12,2) NOT NULL,
    driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Nullable for hired trucks
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('company', 'hired')),
    vendor_name TEXT, -- Transporter/broker for hired trucks
    expected_lr_number TEXT,
    invoice_number TEXT, -- Commercial invoice / Delivery Challan reference
    expected_quantity NUMERIC(12,2),
    quantity_unit TEXT DEFAULT 'units',
    trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
    pod_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 PODS
CREATE TABLE pods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Nullable for hired submissions
    client_upload_id UUID UNIQUE NOT NULL, -- Idempotency key
    storage_path TEXT NOT NULL,
    image_size_bytes INTEGER NOT NULL CHECK (image_size_bytes > 0 AND image_size_bytes <= 307200), -- <= 300KB
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    capture_time TIMESTAMPTZ NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
    gps_accuracy_meters DOUBLE PRECISION,
    upload_status TEXT NOT NULL CHECK (upload_status IN ('pending_upload', 'uploaded', 'upload_failed')),
    verification_status TEXT NOT NULL CHECK (verification_status IN ('pending', 'processing', 'verified', 'approved', 'rejected', 'needs_review', 'retake_requested', 'failed')),
    retake_count INTEGER DEFAULT 0 CHECK (retake_count BETWEEN 0 AND 2),
    attempt_number INTEGER DEFAULT 1 CHECK (attempt_number BETWEEN 1 AND 3),
    reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    corrected_data JSONB DEFAULT NULL, -- Stores human adjustments (corrected_quantity, deduction_amount, adjusted_amount)
    share_token UUID UNIQUE DEFAULT gen_random_uuid(),
    share_token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    is_share_token_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 POD VERIFICATIONS (Append-only AI attempt log)
CREATE TABLE pod_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    storage_path TEXT NOT NULL, -- Preserves exact photo for this attempt
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

-- 1.5 BILLING RECORDS
CREATE TABLE billing_records (
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
    CONSTRAINT uq_billing_records_trip UNIQUE (trip_id) -- Prevents duplicate billing for same trip
);

-- 1.6 UPLOAD TOKENS (For hired drivers)
CREATE TABLE upload_tokens (
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

-- 1.7 STORAGE BUCKET & ROW LEVEL SECURITY (RLS)
INSERT INTO storage.buckets (id, name, public) VALUES ('pod-images', 'pod-images', FALSE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Executives full access to trips" ON trips
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'billing_executive'));

CREATE POLICY "Drivers view assigned trips" ON trips
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

ALTER TABLE pods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Executives full access to pods" ON pods
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'billing_executive'));

CREATE POLICY "Drivers access own pods" ON pods
  FOR ALL TO authenticated
  USING (submitted_by = auth.uid());
```

---

## 2. Seed Data Script (`database/seed.sql`)

```sql
-- Seed auth.users with test passwords (Password123!)
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'billing@transport.com', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rajesh Sharma","role":"billing_executive"}', NOW(), NOW()),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'driver@transport.com', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Suresh Kumar","role":"driver"}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Seed matching profiles
INSERT INTO profiles (id, full_name, role, phone, preferred_language, is_active)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rajesh Sharma', 'billing_executive', '+919876543210', 'en', TRUE),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Suresh Kumar', 'driver', '+919876543211', 'hi', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seed the 3 required scenario trips
INSERT INTO trips (id, trip_number, customer_name, goods_description, vehicle_number, destination, trip_amount, driver_id, vehicle_type, vendor_name, expected_lr_number, invoice_number, expected_quantity, quantity_unit, trip_date)
VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'TRP-66120', 'Company B', 'Cement', 'MH20 EL 4521', 'Nagpur', 38500.00, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'company', NULL, 'LR-9921', 'INV-5510', 500, 'bags', CURRENT_DATE),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'TRP-66134', 'Company C', 'Steel', 'MH20 GT 7718', 'Pune', 26000.00, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'company', NULL, 'LR-8841', 'INV-7740', 25, 'tons', CURRENT_DATE),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'TRP-66141', 'Company D', 'Packaged foods', 'MH17 BY 3092', 'Indore', 41200.00, NULL, 'hired', 'Patil Logistics', 'LR-7719', 'INV-9021', 120, 'cartons', CURRENT_DATE)
ON CONFLICT (trip_number) DO NOTHING;
```

---

## 3. Pydantic API Schemas & Data Contracts

```python
from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from uuid import UUID
from datetime import datetime

# --- AI Extraction Schema ---
class DocumentVerificationResult(BaseModel):
    lr_number: Optional[str] = None
    lr_number_confidence: float = 0.0
    detected_invoice_number: Optional[str] = None
    stamp_visible: bool = False
    signature_visible: bool = False
    delivered_quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    shortage_detected: bool = False
    damage_detected: bool = False
    remarks: Optional[str] = None
    delivery_date: Optional[str] = None
    overall_confidence: float = 0.0

def create_timeout_verification(error_msg: str = "AI_TIMEOUT") -> DocumentVerificationResult:
    return DocumentVerificationResult(
        overall_confidence=0.0,
        remarks=f"Verification failed: {error_msg}"
    )

# --- Decision Evaluation Logic ---
def evaluate_decision(ai_result: Optional[DocumentVerificationResult], trip, retake_count: int) -> str:
    if ai_result is None or ai_result.overall_confidence == 0.0:
        return "needs_review"
    if ai_result.overall_confidence < 0.85:
        return "needs_review"
    if ai_result.shortage_detected or ai_result.damage_detected:
        return "needs_review"
    if trip.expected_lr_number and ai_result.lr_number != trip.expected_lr_number:
        return "needs_review"
    if not ai_result.stamp_visible or not ai_result.signature_visible:
        if retake_count < 2:
            return "retake_requested"
        return "needs_review" # Auto-escalate after 2 retakes
    return "verified"

# --- API Request & Response Models ---
class PodUploadResponse(BaseModel):
    pod_id: UUID
    upload_status: Literal["uploaded"]
    verification_status: Literal["verified", "retake_requested", "needs_review", "failed"]
    attempt_number: int
    message: str

class PodReviewActionRequest(BaseModel):
    decision: Literal["approved", "rejected", "request_retake"]
    review_notes: Optional[str] = None
    corrected_quantity: Optional[float] = None
    deduction_amount: Optional[float] = 0.00
    adjusted_billing_amount: Optional[float] = None

class UploadLinkResponse(BaseModel):
    trip_id: UUID
    token: str
    upload_url: str
    sms_preview_text: str
    expires_at: datetime

class DashboardMetricsResponse(BaseModel):
    total_trips: int
    pods_submitted: int
    pods_pending: int
    needs_review: int
    retake_requested: int
    billing_ready: int
    exported_count: int

class PublicPodViewResponse(BaseModel):
    trip_number: str
    customer_name: str
    vehicle_number: str
    destination: str
    goods_description: str
    delivery_date: Optional[str]
    signed_image_url: str
    verification_status: str

# Trip CSV Import Required Columns:
# trip_number,customer_name,goods_description,vehicle_number,destination,trip_amount,vehicle_type,vendor_name,expected_lr_number,invoice_number,expected_quantity,quantity_unit
```
