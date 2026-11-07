# Implementation Plan and Execution Checklist
## Road Transport POD Management System

**Version:** 1.1 (Goldfish-Audited & Reconciled via EGM)  
**Status:** Approved Execution Blueprint  
**Sprint Window:** 2 Days (Hackathon / Working Prototype)  
**Related documents:** PRD v1.1, Architecture Plan v1.1, Backend & DB Schema v1.1, UI/UX Plan v1.1

---

## 1. Execution Principles

1. **Vertical Slices:** Implement end-to-end features (DB &rarr; API &rarr; UI) in small stages.
2. **Defensive AI Fallbacks:** Wrap Gemini Vision in deterministic 8-second timeouts and fallback factories so an external API glitch never halts the review or billing pipelines.
3. **No Phantom Requirements:** Mock external SMS gateways and direct Tally XML APIs; use standard Tally CSV format and simulated notification cards.

---

## 2. Directory Structure

```text
d:\intern-repo\
├── frontend/                     # Next.js App Router (JavaScript / JSX)
│   ├── public/
│   ├── src/
│   │   ├── app/                  # App routes (driver, review, billing, etc.)
│   │   ├── components/           # UI Components (shared, driver, review)
│   │   ├── hooks/                # use-camera, use-offline-sync
│   │   └── lib/                  # supabase.js, api.js, image-compression.js, idb.js
│   ├── package.json
│   ├── .env.local.example
│   └── tailwind.config.js
├── backend/                      # FastAPI (Python 3.11+)
│   ├── app/
│   │   ├── main.py
│   │   ├── api/                  # auth, trips, pods, review, billing, dashboard
│   │   ├── core/                 # config, security, supabase_client
│   │   ├── schemas/              # Pydantic schemas
│   │   ├── services/             # pod_service, verification_service, billing_service
│   │   └── ai/                   # gemini_provider.py
│   ├── requirements.txt
│   └── .env.example
├── database/
│   ├── migrations/               # 001_initial_schema.sql
│   └── seed.sql                  # Seed data (3 required test trips + sample users)
└── docs/                         # Specifications & audit reports
```

---

## 3. Two-Day Phase Checklist

### Phase 1: Environment & Database Migration (Hours 1–3)
- [ ] Initialize frontend Next.js App Router project and backend FastAPI directory.
- [ ] Write `001_initial_schema.sql` with tables (`profiles`, `trips`, `pods`, `pod_verifications`, `billing_records`, `upload_tokens`) with updated `verification_status` check constraints, `uq_billing_records_trip` unique constraint, and RLS policies.
- [ ] Run `seed.sql` with deterministic test accounts (Driver: `driver@transport.com`, Executive: `billing@transport.com`, Password: `Password123!`) and the 3 core trips (`TRP-66120`, `TRP-66134`, `TRP-66141`).
- [ ] Initialize Supabase private storage bucket `pod-images`.

### Phase 2: FastAPI Core & AI Verification Adapter (Hours 4–6)
- [ ] Setup FastAPI router and dependency injection for Supabase token auth and CORS.
- [ ] Implement `POST /api/pods/upload` with:
  - Form parsing (`file` + metadata).
  - Storage upload with compensation rollback on DB error.
  - Advisory transaction lock on `trip_id` to prevent duplicate concurrent submissions.
  - Gemini Vision extraction with strict 8s timeout and `create_timeout_verification` fallback.
  - Deterministic evaluation logic (`verified`, `retake_requested`, `needs_review`).
- [ ] Implement `POST /api/public/upload/{token}` with `slowapi` rate limiting (10 req/min) and attempt counter tracking (max 3).

### Phase 3: Mobile PWA Driver Flow & Canvas Compression (Hours 7–10)
- [ ] Build driver trip dashboard (`/driver`) with offline status indicator and Hindi/English toggle.
- [ ] Build camera capture screen (`/driver/trips/[id]`) with live stream, camera fallback file-input, and non-blocking GPS handler.
- [ ] Implement HTML5 Canvas compression module (step-down quality loop to < 300 KB).
- [ ] Implement IndexedDB offline capture queue (`idb.js`) with auto-sync on `navigator.onLine`.
- [ ] Build result state screen showing verification outcome with retake count guard (max 2).

### Phase 4: Billing Executive Review, Billing Queue & CSV Export (Hours 11–14)
- [ ] Build operational dashboard (`/dashboard`) with real-time counters and missing POD alerts.
- [ ] Build split-screen review interface (`/review/[id]`) with image zoom/pan and financial shortage reconciliation.
- [ ] Implement `PATCH /api/pods/{id}/review` supporting `approved` / `rejected` / `request_retake` and updating `billing_records`.
- [ ] Build billing queue (`/billing`) with Tally CSV download trigger (`GET /api/billing/export`).
- [ ] Implement daily trip CSV import endpoint (`POST /api/trips/import`) and UI drag-and-drop page (`/trips/import`).

### Phase 5: Hired Driver Link, Public POD View & Seed Testing (Hours 15–16)
- [ ] Build hired driver link generator with "Simulate SMS" modal (`/upload/[token]`).
- [ ] Build public read-only POD verification viewer (`/pod/view/[share_token]`) with 30-day expiry check.
- [ ] Execute End-to-End vertical slice tests:
  - Scenario 1: Clean POD &rarr; Verified &rarr; Billing Queue &rarr; CSV Export.
  - Scenario 2: Missing Stamp &rarr; Retake Requested &rarr; Re-upload &rarr; Verified.
  - Scenario 3: Shortage of 6 Cartons &rarr; Needs Review &rarr; Executive Adjusts &rarr; Approved.
  - Scenario 4: Offline capture &rarr; Disconnect network &rarr; Save &rarr; Reconnect &rarr; Sync &rarr; Verified.

---

## 4. Verification & Done Criteria
- All 4 core test scenarios demonstrably pass without manual database tinkering.
- Image compression strictly keeps every payload under 300 KB.
- Gemini extraction handles timeouts within 8s without crashing FastAPI.
- Codebase clean, documented, and free of any leaked API keys or credentials.
