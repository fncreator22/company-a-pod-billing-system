# Google EGM Adversarial Review Synthesis Report (`egm-res`)
## Road Transport POD Management System

**Framework:** Google Elephant-Goldfish Model (EGM)  
**Stages Executed:**
1. **Stage 1 & 4 (Zoom-Out / Simplicity / YAGNI):** Skeptical Architect Subagent
2. **Stage 3 (Design Critique / Edge Cases & Concurrency):** Design Critic Subagent
3. **Stage 5 (Implementation Readiness / Pre-Flight):** Pragmatic Tech Lead Subagent

---

## 1. Consolidated Review Findings Register

| ID | Originating Stage | Issue Title | Severity | Status in Reconciliation |
|---|---|---|---|---|
| **F-01** | Stage 3 (Design Critic) & Stage 1 (Zoom-Out) | **PostgreSQL CHECK Constraint Violation on Review Action** (`approved`/`rejected` not in `verification_status`) | **Blocker** | **PROPOSED FIX**: Expanded `CHECK` constraint to include `'approved'` and `'rejected'`. |
| **F-02** | Stage 3 (Design Critic) | **Duplicate Billing Records Race Condition** (`trip_id` missing `UNIQUE` constraint in `billing_records`) | **Blocker** | **PROPOSED FIX**: Added `CONSTRAINT uq_billing_records_trip UNIQUE (trip_id)` and advisory locking. |
| **F-03** | Stage 5 (Implementation Readiness) | **Missing Concrete Seed SQL, pgcrypto Hashes & Test Credentials** | **Blocker** | **PROPOSED FIX**: Provided complete, executable `seed.sql` with hashed passwords for `auth.users`, `profiles`, and sample `trips`. |
| **F-04** | Stage 5 (Implementation Readiness) | **Missing Exact Typed API Request/Response Schemas** | **Blocker** | **PROPOSED FIX**: Added full Pydantic models for all endpoints. |
| **F-05** | Stage 1 (Zoom-Out) & Stage 3 (Design Critic) | **FastAPI AI Call Timeout & Crash on Null Result** | **Blocker** | **PROPOSED FIX**: Constrained Gemini call to 8s; added fallback factory function `create_timeout_verification()` so timeouts transition gracefully to `needs_review`. |
| **F-06** | Stage 1 (Zoom-Out) | **Missing Scope Alignment on Daily Trip Import (`FR-17`)** | **Blocker** | **PROPOSED FIX**: Added explicit CSV import endpoint, parser, and phase task in implementation plan. |
| **F-07** | Stage 3 (Design Critic) | **Hired Driver Token Deadlock on Retake** | **Major** | **PROPOSED FIX**: Added `attempt_count` and `max_attempts` (default 3) to `upload_tokens`. Token is only consumed when terminal status is reached. |
| **F-08** | Stage 3 (Design Critic) | **Supabase Storage Orphan File Leak on Partial DB Failure** | **Major** | **PROPOSED FIX**: Added compensation cleanup logic in FastAPI upload handler. |
| **F-09** | Stage 3 (Design Critic) | **Unreconciled Shortage Deductions & Financial Calculation** | **Major** | **PROPOSED FIX**: Added `adjusted_billing_amount` and `deduction_amount` to review payload and `billing_records`. |
| **F-10** | Stage 3 (Design Critic) | **Perpetual Validity of Public Client Share Tokens** | **Major** | **PROPOSED FIX**: Added `share_token_expires_at` (default 30 days) and `is_share_token_revoked` to `pods`. |
| **F-11** | Stage 5 (Implementation Readiness) | **Missing Row Level Security (RLS) & Storage Bucket Initialization DDL** | **Major** | **PROPOSED FIX**: Added complete DDL for RLS policies and Supabase private bucket setup. |
| **F-12** | Stage 1 (Zoom-Out) | **Missing Indian Transport Domain Identifiers** (`invoice_number` / `vendor_name`) | **Major** | **PROPOSED FIX**: Added `invoice_number` and `vendor_name` to `trips` schema and extraction prompt. |
| **F-13** | Stage 1 (Zoom-Out) | **Premature Complexity: Redundant `audit_logs` Table** | **Major** | **PROPOSED FIX**: Dropped generic `audit_logs` table; leveraged domain audit columns in `pods`, `pod_verifications`, and `billing_records`. |
| **F-14** | Stage 5 (Implementation Readiness) | **Missing Environment Variables Specification** | **Major** | **PROPOSED FIX**: Added exact `.env.local` and `backend/.env` variable blocks. |
| **F-15** | Stage 3 (Design Critic) | **Unthrottled Public Upload Endpoint** | **Major** | **PROPOSED FIX**: Added `slowapi` rate limiting (10 req/min) and constant-time token hash verification. |
| **F-16** | Stage 5 & Stage 1 | **Missing Camera Permission & Geolocation Fallbacks in UI Spec** | **Nit** | **PROPOSED FIX**: Added explicit fallback file-picker and non-blocking GPS failure state in UI plan. |

---

## 2. Textual Resolution Strategy

All 16 findings will be applied directly to the 5 documentation files:
- `docs/PRD.md`
- `docs/architecture.md`
- `docs/database-schema.md`
- `docs/ui-ux-plan.md`
- `docs/implementation-plan.md`
