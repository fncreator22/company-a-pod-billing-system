-- ============================================================================
-- Seed Data: seed.sql
-- Description: Deterministic initial data for testing and demonstration
-- Includes:
--   1. Billing Executive user & profile (billing@transport.com / Password123!)
--   2. Company Driver user & profile (driver@transport.com / Password123!)
--   3. Required 3 scenario trips (Clean, Retake, Shortage/Hired)
-- ============================================================================

-- Ensure pgcrypto is loaded
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. AUTH USERS (Deterministic UUIDs with bcrypt salt)
-- ----------------------------------------------------------------------------
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES 
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'billing@transport.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Rajesh Sharma","role":"billing_executive"}',
    NOW(),
    NOW()
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'driver@transport.com',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Suresh Kumar","role":"driver"}',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. PROFILES
-- ----------------------------------------------------------------------------
INSERT INTO profiles (id, full_name, role, phone, preferred_language, is_active)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Rajesh Sharma', 'billing_executive', '+919876543210', 'en', TRUE),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Suresh Kumar', 'driver', '+919876543211', 'hi', TRUE)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  preferred_language = EXCLUDED.preferred_language;

-- ----------------------------------------------------------------------------
-- 3. TRIPS (Three required primary test conditions)
-- ----------------------------------------------------------------------------

-- Scenario 1: Clean POD (TRP-66120) -> Normal submission & direct verification
INSERT INTO trips (
    id, trip_number, customer_name, goods_description, vehicle_number, destination,
    trip_amount, driver_id, vehicle_type, vendor_name, expected_lr_number,
    invoice_number, expected_quantity, quantity_unit, trip_date
)
VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    'TRP-66120',
    'Company B',
    'Cement',
    'MH20 EL 4521',
    'Nagpur',
    38500.00,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'company',
    NULL,
    'LR-9921',
    'INV-5510',
    500,
    'bags',
    CURRENT_DATE
)
ON CONFLICT (trip_number) DO NOTHING;

-- Scenario 2: Retake Requested (TRP-66134) -> Consignee stamp missing
INSERT INTO trips (
    id, trip_number, customer_name, goods_description, vehicle_number, destination,
    trip_amount, driver_id, vehicle_type, vendor_name, expected_lr_number,
    invoice_number, expected_quantity, quantity_unit, trip_date
)
VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
    'TRP-66134',
    'Company C',
    'Steel',
    'MH20 GT 7718',
    'Pune',
    26000.00,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'company',
    NULL,
    'LR-8841',
    'INV-7740',
    25,
    'tons',
    CURRENT_DATE
)
ON CONFLICT (trip_number) DO NOTHING;

-- Scenario 3: Needs Review & Hired Truck (TRP-66141) -> Shortage of 6 cartons
INSERT INTO trips (
    id, trip_number, customer_name, goods_description, vehicle_number, destination,
    trip_amount, driver_id, vehicle_type, vendor_name, expected_lr_number,
    invoice_number, expected_quantity, quantity_unit, trip_date
)
VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
    'TRP-66141',
    'Company D',
    'Packaged foods',
    'MH17 BY 3092',
    'Indore',
    41200.00,
    NULL, -- Hired vehicle without assigned company driver
    'hired',
    'Patil Logistics',
    'LR-7719',
    'INV-9021',
    120,
    'cartons',
    CURRENT_DATE
)
ON CONFLICT (trip_number) DO NOTHING;
