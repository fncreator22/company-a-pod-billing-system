# Product Requirements Document (PRD)
## Road Transport POD Management System

**Version:** 1.1 (Goldfish-Audited & Reconciled via EGM)  
**Status:** Approved for Implementation  
**Product type:** Mobile-first Progressive Web App (PWA)  
**Target:** Functional client prototype  
**Development deadline:** 2 days  
**Frontend:** Next.js, JavaScript, App Router  
**Backend:** FastAPI, Python  
**Database, authentication and storage:** Supabase  
**AI provider:** Gemini Vision API, behind a replaceable provider interface

---

## 1. Product Overview

The product is a Proof of Delivery (POD) management system for a road transport fleet.

It helps a transport company collect delivery documents from drivers, verify the documents using AI, handle exceptions through a human review process, and prepare verified deliveries for billing.

The application must support both company-owned and hired vehicles.

The primary problem is that signed delivery documents, including lorry receipts (LR), delivery challans, and proof of delivery, are often delayed or missing. This delays billing and makes it difficult for the billing team to identify incomplete deliveries.

The MVP will digitize this workflow.

## 2. Business Context

The client operates:

- 140 company-owned trucks.
- 200 hired trucks.

The system must support both types of drivers.

The prototype demonstrates how a delivery moves from trip assignment to POD submission, verification, review if necessary, and billing preparation.

## 3. Product Objectives

The MVP must:

1. Allow drivers to submit POD photographs from a mobile device.
2. Capture the photograph's timestamp and available GPS coordinates (with non-blocking fallback if denied).
3. Support offline capture and later upload via IndexedDB.
4. Compress photographs to below 300 KB before upload using native Canvas.
5. Use AI to extract and check important POD information (LR number, invoice/challan number, consignee stamp, signature, delivered quantity).
6. Identify missing, unreadable, or inconsistent information.
7. Allow a billing executive to review exceptions, record manual corrections, and calculate financial shortage deductions without overwriting original AI extraction.
8. Provide a billing queue containing verified and approved deliveries, with duplicate-billing prevention.
9. Export billing data in a Tally-compatible CSV format.
10. Display missing PODs and operational status on a dashboard.

## 4. User Roles

### 4.1 Driver

The driver needs to:

- View assigned trips.
- Open a trip.
- Capture a POD photograph with live camera preview (or camera fallback file input).
- Submit the photograph.
- See whether the photograph was accepted, needs a retake, or requires review.
- Retry an upload when internet connectivity becomes available.

The interface is simple, icon-led, and bilingual (English/Hindi) for drivers with basic smartphone experience.

### 4.2 Hired Driver

A hired driver submits a POD through a secure link sent via SMS.

The link identifies the relevant trip and allows the driver to upload the delivery photograph without needing app login credentials.
- The link allows up to 3 submission attempts (initial + 2 retakes).
- It terminates automatically once verification succeeds or moves to manual review.

**Prototype approach:** Simulate SMS delivery and demonstrate the link-based upload workflow. A real SMS gateway is not required.

### 4.3 Billing Executive

The billing executive needs to:

- View submitted PODs and operational metrics.
- Review AI extraction results against original photographs in a split-screen viewer with zoom/pan tools.
- Correct extracted information and calculate shortage deductions without overwriting original AI results.
- Approve or reject a POD, or request a retake (up to limit).
- View deliveries ready for billing and download Tally CSV exports.
- Generate and dispatch hired-driver upload links with simulated SMS previews.
- Import daily trips via CSV.

## 5. Core User Workflows

### Workflow A: Company Driver POD Submission

1. Driver logs in.
2. Driver views assigned trips.
3. Driver selects a trip.
4. Driver captures the POD photograph.
5. Application records capture time and available GPS information (or notes "unavailable" without blocking submission).
6. Application compresses the photograph to below 300 KB via Canvas.
7. If offline, the application saves the submission in browser storage (IndexedDB).
8. When connectivity returns, the application attempts upload.
9. Backend stores the photograph in private storage and starts AI verification (with an 8-second timeout).
10. Driver receives the resulting status synchronously with an animated scanning indicator. If AI times out, it falls back gracefully to `needs_review`.

### Workflow B: Hired Driver POD Submission

1. Billing executive initiates an upload invitation for an unassigned/hired trip.
2. System generates a secure, trip-specific token upload link (`/upload/{token}`).
3. The link is shared through the prototype's simulated SMS workflow (toast/modal with copy link).
4. Hired driver opens the link on mobile.
5. Driver captures and submits the POD photograph.
6. System processes the photograph using the same verification workflow, permitting up to 3 attempts.

### Workflow C: AI Verification

The AI system inspects the original POD photograph and extracts:

- LR number (and checks against expected LR).
- Consignor invoice or delivery challan number.
- Consignee stamp visibility.
- Consignee signature visibility.
- Delivered quantity and unit.
- Shortage or damage remarks.
- Delivery date.
- Overall confidence score.

Possible outcomes:

**Verified**
- Required visual elements (stamp and signature) are visible.
- LR number matches the trip record (if expected LR provided).
- Confidence meets the configured threshold (default: 0.85).
- No shortage or damage exception is detected.

**Retake Requested**
- The photograph is blurry, cropped, or unreadable.
- A required visual element (stamp/signature) is missing, but retake count is < 2.
- A new photograph could reasonably resolve the problem.

**Needs Review**
- Shortage or damage is detected or remarked.
- LR number conflicts with the trip record.
- AI confidence is low (< 0.85).
- Maximum retakes (2 additional attempts) have been reached without clean verification.
- AI request timed out or returned unparseable content.

AI must not independently authorize invoice dispatch.

### Workflow D: Human Review

1. Billing executive opens the review queue.
2. Executive selects a POD flagged as `needs_review`.
3. Executive views side-by-side original photograph and AI-extracted fields.
4. Executive inspects the evidence and checks discrepancy notes.
5. Executive enters corrections (e.g. adjusts delivered quantity, calculates deduction, or updates billed amount) and records a decision (`approved`, `request_retake`, `rejected`).
6. Corrections and review decisions are saved with reviewer ID, notes, and timestamp.
7. Original AI extraction remains immutable in `pod_verifications` for audit.
8. Approved PODs move to the billing queue (`billing_ready`).

### Workflow E: Billing Preparation & Export

1. Billing executive opens the billing queue.
2. Executive views verified and approved POD records.
3. Executive inspects delivery and billing information.
4. Executive triggers CSV export.
5. Exported data includes trip, vehicle, customer, LR, delivered quantity, shortage remarks, and final billed amount.
6. Records transition to `exported` status with an audit reference. A database unique constraint prevents duplicate billing records for the same trip.

Invoices must not be automatically dispatched to customers.

### Workflow F: Missing POD Dashboard

The dashboard displays:

- Total trips.
- POD submitted.
- POD pending (missing).
- POD under review.
- Retake requested.
- Ready for billing.
- Exported records.

## 6. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | User authentication (Driver and Billing Executive) | Must |
| FR-02 | Role-based access control and trip ownership boundaries | Must |
| FR-03 | Display assigned trips for logged-in driver | Must |
| FR-04 | Mobile camera capture with live preview and file-input fallback | Must |
| FR-05 | Record capture timestamp and available GPS (with graceful non-blocking fallback) | Must |
| FR-06 | Client-side Canvas image compression below 300 KB | Must |
| FR-07 | Offline submission storage in IndexedDB | Must |
| FR-08 | Automatic and manual retry for pending uploads when online | Must |
| FR-09 | Secure private cloud storage for POD photographs with signed URLs | Must |
| FR-10 | Gemini Vision AI extraction with 8s timeout and fallback to manual review | Must |
| FR-11 | Retake management (maximum 2 retakes before auto-escalation to review) | Must |
| FR-12 | Human review interface with non-destructive correction fields and financial reconciliation | Must |
| FR-13 | Billing queue with eligible verified/approved deliveries and duplicate billing protection | Must |
| FR-14 | Tally-compatible CSV export | Must |
| FR-15 | Real-time missing-POD operational dashboard | Must |
| FR-16 | Hired-driver tokenized upload link with multi-attempt support and mock SMS delivery | Must |
| FR-17 | Daily trip CSV import with header validation | Must |
| FR-18 | Time-limited (30-day) client read-only POD verification viewer link | Should |
| FR-19 | Icon-led, bilingual (English/Hindi) driver UI | Must |

## 7. Sample Data

The prototype is seeded with these three primary test scenarios:

| Trip ID | Customer | Goods | Vehicle | Destination | Amount | Initial Scenario |
|---|---|---|---|---|---:|---|
| TRP-66120 | Company B | Cement | MH20 EL 4521 | Nagpur | ₹38,500 | Verified (Clean document) |
| TRP-66134 | Company C | Steel | MH20 GT 7718 | Pune | ₹26,000 | Retake requested (Missing stamp) |
| TRP-66141 | Company D | Packaged foods | MH17 BY 3092 | Indore | ₹41,200 | Needs review (Shortage 6 cartons, Hired truck) |

---
