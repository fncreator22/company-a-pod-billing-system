# Company A Fleet: Road Transport POD Management & Billing System

[![CI - Pytest Regression Suite](https://img.shields.io/badge/pytest-14%20passed-emerald)](https://github.com/fncreator22/company-a-pod-billing-system)
[![Next.js 15 App Router](https://img.shields.io/badge/Next.js-15.5-black)](https://github.com/fncreator22/company-a-pod-billing-system)
[![FastAPI Backend](https://img.shields.io/badge/FastAPI-1.1-teal)](https://github.com/fncreator22/company-a-pod-billing-system)
[![DPDP Act 2023 Compliant](https://img.shields.io/badge/Compliance-DPDP%20Act%202023-blue)](https://github.com/fncreator22/company-a-pod-billing-system)

Enterprise mobile-first Progressive Web App (PWA) and desktop billing desk built for **Company A (Chhatrapati Sambhajinagar, Maharashtra)** to capture physical signed Proof of Delivery (POD) documents at consignee gates, verify stamps and signatures via Vision AI, handle shortage exceptions with automated penalty calculations, and export verified vouchers directly into Tally ERP.

---

## 📌 Problem Context & Financial Impact

Company A operates **140 company-owned trucks and 200 hired trucks** transporting cement, steel, and packaged foods across western and central India (2,200 trips/month at ₹32,000 average freight = ₹84.48 Crore/year).

- **Current Pain:** Physical paper Lorry Receipts (LRs) take **10 to 20 days** to return from 800 km away. Photos sent via WhatsApp get lost or compressed illegibly. Customers reject invoices without physical or verified PODs.
- **Financial Savings:**
  - Reducing POD-to-invoice turnaround from 18 days to 4 days brings billing forward by 14 days, unlocking **₹3.24 Crore in working capital** and saving **₹38.9 Lakh/year** in interest (at 12%).
  - Reducing lost/disputed PODs from 1.5% to 0.5% protects **₹42.24 Lakh/year** in freight deductions.
  - **Total Annual Economic Benefit:** **₹81.14 Lakh/year to ₹1.02 Crore/year**.

---

## 🚀 Key System Capabilities

### 1. Driver Mobile Capture (Company Fleet)
- **One Big Tap Target:** Built with maximum contrast daylight styling for outdoor sunlight conditions at consignee unloading docks.
- **Gate GPS & Time Stamping:** Automatically timestamps and geo-stamps every photo via device geolocation (`navigator.geolocation`).
- **Offline Storage & Compression:** Native HTML5 Canvas step-down loop compresses camera photos to **< 300 KB**. If highway connectivity drops, photos are stored in IndexedDB and queued for network reconnection.
- **Trilingual Voice Assistance:** Native speech synthesis in **Hindi, Marathi, and Indian English** providing audible spoken instructions without requiring reading literacy.

### 2. Zero-Friction SMS Link for Hired Drivers
- Secure, token-based public mobile web portal (`/upload/[token]`) for hired 3rd-party drivers who refuse to install mobile apps.
- Enforces rate limits (10 req/min) and tracks attempt limits (capped at 3 submissions).

### 3. Vision AI Verification & Visual Grounding
- Checks LR number match, consignee stamp clarity, receiver signature, and handwritten shortage/damage remarks.
- **Visual Grounding:** Displays neon bounding box overlays over the original document indicating exactly where stamps and signatures were verified.
- **Auto-Retake Limit:** Automatically asks for a retake if the stamp is blurred (capped at 2 retakes before escalating to office review to prevent driver lockouts).

### 4. Exception Review Workspace
- Split-screen workspace for billing executives showing the original photo as the source of truth side-by-side with trip metadata.
- **AI Shortage Deduction Estimator:** Automatically computes cargo deficit penalties (₹400/carton deficit) and adjusts billing amounts before final approval.

### 5. Billing Queue & Tally ERP Export
- Groups verified and approved deliveries by client and billing cycle.
- Generates standard, one-click `tally_pod_export.csv` vouchers matching Tally ERP batch import specifications.

### 6. Executive Operations Dashboard & Regional Hub SLA
- Live KPI cards: Total Trips, PODs Submitted, Missing (Pending), In Review, Ready to Bill, Exported.
- Regional hub turnaround benchmarks comparing Chhatrapati Sambhajinagar HQ, Pune Depot, and Nagpur Hub against the 18-day baseline.
- Dedicated Client Transparency Portal (`/portal/[customerId]`) allowing customers to inspect verified gate receipts and tax invoices.

---

## 🛠️ Technology Stack & Architecture

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS (Bespoke industrial zinc/amber theme), Lucide Icons, HTML5 Canvas, IndexedDB.
- **Backend:** FastAPI (Python 3.13), Uvicorn, SlowAPI (rate limiting), Pydantic v2 schemas.
- **Database / Schema:** PostgreSQL 15 DDL with Row Level Security (RLS) policies and test fixtures.
- **AI Integration:** Google Gemini Vision multimodal adapter with strict 8-second timeout SLA and deterministic fallbacks.
- **Testing:** Playwright (cross-viewport headless visual audit) and Pytest (14 end-to-end integration scenarios).

---

## 🏁 Quickstart: Running Locally

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- Git

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/fncreator22/company-a-pod-billing-system.git
cd company-a-pod-billing-system/backend

# Create virtual environment (optional)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run FastAPI backend (Port 8000)
$env:PYTHONPATH="."
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Run Next.js production build or dev server (Port 3000)
npm run build
npm run start -- -p 3000
```
Application will be live at: `http://localhost:3000`

---

## 🧪 Running Automated Tests

Run the full backend integration test suite covering all client scenarios:
```bash
$env:PYTHONPATH="D:\intern-repo\backend"
python -m pytest backend/tests/ -v
```
**Results:** `14 passed in 0.47s`

---

## 📱 Reviewer Credentials & Key URLs

| Screen | URL | Purpose / Access |
|---|---|---|
| **Executive Dashboard** | `http://localhost:3000/dashboard` | Main operations dashboard with SLA tracker |
| **Exception Review** | `http://localhost:3000/review` | Visual grounding split-screen and penalty calculator |
| **Billing & Tally Export** | `http://localhost:3000/billing` | Verified queue and Tally ERP CSV export |
| **Driver Mobile PWA** | `http://localhost:3000/driver` | High-contrast driver interface with Marathi/Hindi voice |
| **Hired Driver SMS Link** | `http://localhost:3000/upload/hired-driver-token-141` | Public token upload without login |
| **Client Portal** | `http://localhost:3000/portal/Company%20B` | Consignee transparency portal |

---

## 📄 License & Compliance

Developed for Company A transport operations. All personal information (driver phone numbers, consignee contact details) is protected under the provisions of the **Digital Personal Data Protection (DPDP) Act 2023**.
