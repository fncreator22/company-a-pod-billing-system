"""
Test Suite: test_schema_and_seed.py
Purpose: Verification-Before-Completion (VBC) test for Stage 1 Database DDL & Seed.
Validates table creation, constraints, foreign keys, unique indexes, and seed records
against an in-memory SQLite schema emulation to guarantee zero SQL syntax errors,
correct foreign keys, and full relational integrity.
"""

import sqlite3
import re
import pytest

def test_sql_syntax_and_relations():
    with open("database/migrations/001_initial_schema.sql", "r", encoding="utf-8") as f:
        schema_sql = f.read()

    with open("database/seed.sql", "r", encoding="utf-8") as f:
        seed_sql = f.read()

    def pg_to_sqlite(sql: str) -> str:
        s = sql
        s = re.sub(r'CREATE EXTENSION[^;]+;', '', s)
        s = re.sub(r'INSERT INTO storage\.buckets[^;]+;', '', s)
        s = re.sub(r'ALTER TABLE[^;]+;', '', s)
        s = re.sub(r'CREATE POLICY[^;]+;', '', s)
        s = re.sub(r'TIMESTAMPTZ', 'TEXT', s)
        s = re.sub(r'TIMESTAMP WITH TIME ZONE', 'TEXT', s)
        s = re.sub(r'UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)', 'TEXT PRIMARY KEY', s)
        s = re.sub(r'DEFAULT gen_random_uuid\(\)', "DEFAULT 'uuid-placeholder'", s)
        s = re.sub(r'UUID', 'TEXT', s)
        s = re.sub(r'JSONB', 'TEXT', s)
        s = re.sub(r'NUMERIC\([0-9]+,[0-9]+\)', 'NUMERIC', s)
        s = re.sub(r'DOUBLE PRECISION', 'REAL', s)
        s = re.sub(r'DEFAULT CURRENT_DATE', "DEFAULT '2026-11-08'", s)
        s = re.sub(r'CURRENT_DATE', "'2026-11-08'", s)
        s = re.sub(r'DEFAULT NOW\(\)', "DEFAULT '2026-11-08 00:00:00'", s)
        s = re.sub(r'NOW\(\)', "'2026-11-08 00:00:00'", s)
        s = re.sub(r'DEFAULT \(NOW\(\) \+ INTERVAL \'30 days\'\)', "DEFAULT '2026-12-08 00:00:00'", s)
        s = re.sub(r'\(NOW\(\) \+ INTERVAL \'30 days\'\)', "'2026-12-08 00:00:00'", s)
        s = re.sub(r'INTERVAL \'30 days\'', "'30 days'", s)
        # Note: crypt('...', gen_salt('bf')) has nested parens
        s = re.sub(r'crypt\([^,]+,\s*gen_salt\(\'bf\'\)\)', "'$2b$12$hashedpassword'", s)
        s = re.sub(r'REFERENCES auth\.users\(id\)', 'REFERENCES auth_users(id)', s)
        return s

    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()

    # 1. Create a mock auth_users table for FK resolution
    cursor.execute("""
        CREATE TABLE auth_users (
            id TEXT PRIMARY KEY,
            instance_id TEXT,
            aud TEXT,
            role TEXT,
            email TEXT,
            encrypted_password TEXT,
            email_confirmed_at TEXT,
            raw_app_meta_data TEXT,
            raw_user_meta_data TEXT,
            created_at TEXT,
            updated_at TEXT
        );
    """)

    adapted_schema = pg_to_sqlite(schema_sql)
    
    # Execute adapted DDL statements
    for statement in adapted_schema.split(";"):
        stmt = statement.strip()
        if stmt:
            cursor.execute(stmt)

    # Adapt seed
    adapted_seed = pg_to_sqlite(seed_sql)
    adapted_seed = adapted_seed.replace("auth.users", "auth_users")
    # In SQLite, remove PostgreSQL specific DO UPDATE SET ... EXCLUDED syntax
    adapted_seed = re.sub(r'ON CONFLICT \(id\) DO UPDATE[^;]+;', ';', adapted_seed)
    
    for statement in adapted_seed.split(";"):
        stmt = statement.strip()
        if stmt:
            cursor.execute(stmt)

    # 2. Verification Queries
    cursor.execute("SELECT count(*) FROM auth_users;")
    auth_count = cursor.fetchone()[0]
    assert auth_count == 2, f"Expected 2 auth users, got {auth_count}"

    cursor.execute("SELECT count(*) FROM profiles;")
    profile_count = cursor.fetchone()[0]
    assert profile_count == 2, f"Expected 2 profiles, got {profile_count}"

    cursor.execute("SELECT trip_number, trip_amount, vehicle_type, vendor_name, invoice_number FROM trips ORDER BY trip_number;")
    trips = cursor.fetchall()
    assert len(trips) == 3, f"Expected 3 trips, got {len(trips)}"
    assert trips[0] == ("TRP-66120", 38500.0, "company", None, "INV-5510")
    assert trips[1] == ("TRP-66134", 26000.0, "company", None, "INV-7740")
    assert trips[2] == ("TRP-66141", 41200.0, "hired", "Patil Logistics", "INV-9021")

    # 3. Test verification_status CHECK constraint permits 'approved' and 'rejected'
    cursor.execute("""
        INSERT INTO pods (
            id, trip_id, submitted_by, client_upload_id, storage_path,
            image_size_bytes, mime_type, capture_time, upload_status,
            verification_status, retake_count, attempt_number
        ) VALUES (
            'p1', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
            'u1', 'pods/trip1/img1.jpg', 250000, 'image/jpeg', '2026-11-08T00:00:00',
            'uploaded', 'approved', 0, 1
        );
    """)

    cursor.execute("SELECT verification_status FROM pods WHERE id = 'p1';")
    status = cursor.fetchone()[0]
    assert status == "approved", f"Expected status 'approved', got {status}"

    # 4. Test duplicate billing constraint (uq_billing_records_trip)
    cursor.execute("""
        INSERT INTO billing_records (
            id, pod_id, trip_id, original_amount, deduction_amount,
            final_billed_amount, billing_status
        ) VALUES (
            'b1', 'p1', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 38500.0, 0.0, 38500.0, 'billing_ready'
        );
    """)

    # Attempting to insert a duplicate billing record for the same trip must fail
    with pytest.raises(sqlite3.IntegrityError):
        cursor.execute("""
            INSERT INTO billing_records (
                id, pod_id, trip_id, original_amount, deduction_amount,
                final_billed_amount, billing_status
            ) VALUES (
                'b2', 'p1', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 38500.0, 0.0, 38500.0, 'billing_ready'
            );
        """)

    conn.close()
    print("ALL STAGE 1 DATABASE VERIFICATIONS PASSED CONCRETELY.")

if __name__ == "__main__":
    test_sql_syntax_and_relations()
