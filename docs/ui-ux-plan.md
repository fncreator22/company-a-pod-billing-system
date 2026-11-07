# UI/UX Design Plan
## Road Transport POD Management System

**Version:** 1.1 (Goldfish-Audited & Reconciled via EGM)  
**Status:** Approved Design Specification  
**Related documents:** PRD v1.1, Architecture Plan v1.1, Backend & DB Schema v1.1

---

## 1. Design Overview & Personas

The system features two tailored interfaces:
1. **Driver Experience (Mobile PWA):** Clean, high-contrast, large touch targets (minimum 48px), icon-accompanied action buttons, bilingual text (Hindi and English), and resilient offline indicators.
2. **Billing Executive Experience (Desktop Web):** Dense information layout, side-by-side photo inspection with pan/zoom tools, fast keyboard-friendly review workflows, and financial shortage calculation.

---

## 2. Design System & Tokens

- **Primary:** Deep Slate `#0F172A`
- **Brand / Accent:** Transport Blue `#2563EB`
- **Success:** Emerald Green `#059669` (Verified, Billing Ready)
- **Warning:** Amber `#D97706` (Needs Review, Upload Pending)
- **Error:** Crimson `#DC2626` (Retake Required, Failed)
- **Surfaces:** Clean White `#FFFFFF` on Light Slate `#F8FAFC`
- **Typography:** Inter / System Sans-serif, High legibility numerals for LR / Amount formatting.

---

## 3. Screen Specifications & Flow

### Driver Flow

#### Screen D1: Driver Login & Trip List (`/driver`)
- Persistent offline / online connectivity pill at the top.
- Language toggle (English / हिंदी).
- Large cards for assigned trips displaying:
  - Customer & Destination.
  - Vehicle number, Trip ID, Expected LR / Invoice #.
  - Current POD badge (`Pending`, `Retake Required`, `Verified`).
  - Action button: **Capture POD / फोटो लें**.

#### Screen D2: POD Capture & Preview (`/driver/trips/[id]`)
- Live camera stream with guide overlay showing LR document alignment corners.
- **Camera Fallback:** If camera permission is denied or blocked, display an amber banner with an instant file upload button: `<input type="file" accept="image/*" capture="environment">`.
- **GPS Fallback:** Displays location status ("GPS Active: 19.9975° N, 73.7898° E" or "GPS: Offline/Unavailable"). Geolocation denial or timeout **never blocks** the "Confirm & Upload" action; coordinates default to null.
- Captured preview screen showing:
  - Image thumbnail.
  - Compression indicator: "Compressed: 245 KB (< 300 KB limit)".
  - Retake button vs Confirm & Upload button.

#### Screen D3: AI Verification Progress & Result
- Animated scanning state while backend executes Gemini Vision:
  - "AI Verifying Document..." (bounded by 8s timeout).
- Three explicit outcome cards:
  - **Verified (हरा):** Checkmark, LR # extracted, "Trip ready for billing".
  - **Retake Requested (पीला/लाल):** Warning icon, clear guidance: *"Consignee stamp missing. Please retake photo."* Action: **Retake Now (Attempt 2 of 3)**.
  - **Needs Review (नीला):** Clock icon: *"Delivered with remarks. Office team will review."*

---

### Billing Executive Flow

#### Screen E1: Executive Dashboard (`/dashboard`)
- KPI Summary Cards:
  - Total Trips Today.
  - PODs Submitted.
  - Missing PODs (Actionable alert list with vendor name & driver contact for hired trucks).
  - Exception Review Queue count.
  - Ready for Billing count.
  - Exported records count.

#### Screen E2: Exception Review (`/review/[id]`)
- Split-screen comparison:
  - **Left (55% width):** High-resolution POD image viewer with zoom in/out, pan, and rotate tools.
  - **Right (45% width):** Trip details + Gemini AI extracted fields with confidence badges:
    - LR Number (Matched / Conflict)
    - Invoice / Delivery Challan #
    - Consignee Stamp & Signature (Detected / Not Found)
    - Delivered Quantity vs Expected Quantity
    - Shortage / Damage Remarks (Highlighted in red)
  - **Reviewer Action & Financial Reconciliation:**
    - Corrected quantity field.
    - Deduction amount (₹) & Adjusted Billed Amount (₹) fields.
    - Notes textarea.
    - Three buttons: **Approve for Billing**, **Request Retake**, **Reject**.

#### Screen E3: Billing Queue & Export (`/billing`)
- Table of all verified & approved deliveries ready for invoice generation.
- Batch select all / individual trips.
- Primary CTA: **Download Tally CSV Export**.
- Displays export timestamp and audit status.

#### Screen E4: Hired Driver Upload Dispatcher
- Search hired trip without assigned driver.
- Click "Generate Upload Link".
- Modal shows unique link: `https://transport-pod.app/upload/{token}`.
- Quick buttons: "Copy Link" and "Simulate SMS Send" (displays incoming SMS push mock).
- Tracks attempt count (up to 3 attempts allowed).

#### Screen E5: Public / Client POD Viewer (`/pod/view/[share_token]`)
- Clean, read-only presentation for clients (valid for 30 days).
- Shows Delivery Summary, Verified Timestamp, and Signed POD photograph.
- Sensitive internal financial data (costs, margins, reviewer notes) is omitted.
