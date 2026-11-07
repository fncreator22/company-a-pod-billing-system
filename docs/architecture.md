# System Architecture Plan
## Road Transport POD Management System

**Version:** 1.1 (Goldfish-Audited & Reconciled via EGM)  
**Status:** Approved Architecture  
**Related document:** PRD v1.1

---

## 1. Architecture Overview

The system uses a client-server architecture.

The frontend is a mobile-first Progressive Web App (Next.js App Router) handling camera access with fallback file picker, progressive HTML5 Canvas image compression, IndexedDB offline queuing, and synchronization.

The backend is a modular FastAPI service managing business logic, role-based authorization, rate-limited public endpoints, idempotent upload processing with orphan storage cleanup, AI provider interaction with fail-fast timeouts, exception review, billing queue management with duplicate prevention, and Tally CSV export.

Supabase provides PostgreSQL, Authentication, and Private Storage.

Gemini Vision API is integrated via a swappable backend adapter interface.

### Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js 14+ (App Router) | Mobile PWA & Desktop Executive UI |
| Language | JavaScript / JSX | Fullstack frontend |
| Styling | Tailwind CSS | Responsive mobile & desktop layouts |
| Backend | FastAPI (Python 3.11+) | RESTful API & business orchestration |
| Database | Supabase PostgreSQL | Relations, constraints, RLS policies |
| Auth | Supabase Auth | User identity, JWT sessions |
| Storage | Supabase Storage | Private bucket `pod-images` |
| AI | Gemini Vision (via `google-genai`) | Multimodal document extraction & visual checks |
| Offline Storage | IndexedDB | Local queue for offline capture & sync |
| Rate Limiting | `slowapi` | Protection on unauthenticated public routes |

---

## 2. Environment Variables

### `frontend/.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

### `backend/.env`
```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_JWT_SECRET=<jwt-secret-from-supabase>
GEMINI_API_KEY=<gemini-api-key>
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
PORT=8000
```

---

## 3. Frontend Architecture

### Route Directory (`frontend/src/app/`)

```text
app/
├── layout.js
├── page.js                        # Landing & Role Redirect
├── login/page.js                  # Authentication
├── driver/
│   ├── page.js                    # Driver Assigned Trips List
│   └── trips/[id]/page.js         # Trip Detail, Camera Capture & Upload
├── upload/[token]/page.js         # Hired Driver Tokenized Upload (No login required)
├── pod/view/[share_token]/page.js  # Public / Client Read-Only POD Verification Viewer
├── dashboard/page.js              # Billing Executive Metrics & Missing PODs
├── review/
│   ├── page.js                    # Review Queue
│   └── [id]/page.js               # Side-by-Side Reviewer Inspection & Corrections
├── billing/page.js                # Billing Queue & Tally CSV Export
└── trips/import/page.js           # Daily Trip CSV Import
```

### Client-Side Image Compression

**Compression Algorithm:**
1. Read captured `File` into an `HTMLImageElement`.
2. Draw into an offscreen `HTMLCanvasElement`, scaling max dimension to 1600px (preserving aspect ratio and text legibility).
3. Call `canvas.toBlob(blob, 'image/jpeg', quality)` starting at quality `0.8`.
4. If `blob.size > 300 * 1024`, decrement quality by `0.1` down to `0.4` until target size is met.
5. Pass compressed Blob directly to IndexedDB or the multipart upload form.

### Offline & Synchronization

IndexedDB store: `pending_pods`
- `client_upload_id`: UUID (v4)
- `trip_id`: UUID
- `blob`: Compressed JPEG (< 300 KB)
- `capture_time`: ISO8601 string
- `latitude`: Number | null
- `longitude`: Number | null
- `attempt_number`: Integer (1, 2, or 3)
- `status`: `'pending_upload' | 'uploading' | 'failed'`

When online, `navigator.onLine` or manual "Sync Now" flushes items sequentially. Idempotency guarantees no duplicate server records.

---

## 4. Backend Processing & Concurrency

### Synchronous AI Timeout & Fail-Safe Fallback
- FastAPI handles `POST /api/pods/upload` with an **8-second Gemini call timeout**.
- Next.js shows an animated scanning progress overlay ("AI verifying stamps, signatures & LR...").
- If Gemini exceeds 8 seconds or throws an error, FastAPI:
  1. Catches the timeout/exception.
  2. Creates a fallback `DocumentVerificationResult(overall_confidence=0.0, remarks="AI_TIMEOUT")`.
  3. Saves the photo in Supabase Storage.
  4. Inserts `pod_verifications` with `error_message='AI_TIMEOUT'`.
  5. Transitions `pods.verification_status` to `'needs_review'`.
  6. Returns HTTP 200 with status `needs_review` so the driver UI never freezes.

### Orphan Storage Leak Prevention
Supabase Storage is non-transactional with PostgreSQL. To prevent ghost objects:
```python
storage_path = f"pods/{trip_id}/{attempt_number}_{client_upload_id}.jpg"
await supabase.storage.from_("pod-images").upload(storage_path, file_bytes)
try:
    await db.insert_pod_record(...)
except Exception as db_err:
    # Compensation transaction: roll back storage write
    await supabase.storage.from_("pod-images").remove([storage_path])
    raise db_err
```

### Duplicate Billing Protection & Advisory Locks
To eliminate race conditions when network flapping triggers dual uploads:
1. `billing_records` enforces `CONSTRAINT uq_billing_records_trip UNIQUE (trip_id)`.
2. In `POST /api/pods/upload`, FastAPI acquires a PostgreSQL transaction advisory lock:
   `SELECT pg_advisory_xact_lock(hashtext(trip_id::text));`
   This serializes concurrent requests for the same trip.

---

## 5. Security & Authorization

1. **Role-Based Access Control (RBAC):**
   - Drivers query only `trips WHERE driver_id = auth.uid()`.
   - Billing Executives have full access to trips, review queues, and billing data.
2. **Hired Driver Security:**
   - Unauthenticated hired drivers submit via `POST /api/public/upload/{token}`.
   - Protected by `slowapi` rate limiting (10 req/minute per IP).
   - Token is a 32-byte hex string verified via `sha256(token)` against `upload_tokens.token_hash`.
   - Supports up to 3 submission attempts (`attempt_count < max_attempts`). Token is invalidated only upon reaching terminal status (`verified`, `approved`, `needs_review`) or exceeding 3 attempts.
3. **Public Client POD Link Protection:**
   - Link `/pod/view/[share_token]` expires after 30 days (`share_token_expires_at`).
   - Generates a short-lived (15-minute) signed URL for the image only.
   - Emits a sanitized public response concealing internal financial ledgers.
4. **Private Storage Protection:**
   - Bucket `pod-images` is strictly private. Direct public access is blocked.
