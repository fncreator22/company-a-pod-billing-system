# Deployment & Local Run Guide
## Road Transport Fleet POD Management System

**Client:** Company A, Chhatrapati Sambhajinagar, Maharashtra  
**Project:** Road Transport Fleet's Proof-of-Delivery Capture and Billing Prototype  
**Submission Requirement:** 2 of 2 in submission ZIP (`deployment.md`)

---

## 1. How to Run Locally (Step by Step)

### Prerequisites
- **Node.js:** v18.x or higher (Tested on Node v24.15.0)
- **Python:** v3.11 or higher (Tested on Python 3.13.7)
- **Git**

---

### Step 1: Backend Setup & Launch (FastAPI)

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the automated verification test suite to ensure the system is healthy:
   ```powershell
   # Windows PowerShell:
   $env:PYTHONPATH="."
   python -m pytest tests/ -v
   ```
   *(All 14 unit and end-to-end integration tests must pass).*

4. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
5. Confirm backend is running by opening:
   - Health check: `http://127.0.0.1:8000/api/health`
   - Interactive OpenAPI Docs (Swagger): `http://127.0.0.1:8000/docs`

---

### Step 2: Frontend Setup & Launch (Next.js PWA)

1. Open a second terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev -- -p 3000
   ```
4. Access the application in your browser:
   - **Driver Mobile Experience:** `http://localhost:3000/driver`
   - **Billing Executive Dashboard:** `http://localhost:3000/dashboard`
   - **Exception Review Queue:** `http://localhost:3000/review`
   - **Billing Queue & Tally Export:** `http://localhost:3000/billing`
   - **Daily Trip CSV Import:** `http://localhost:3000/trips/import`

---

## 2. Environment Variables Specification

> **Rule Adherence:** As required by the evaluation rules, only variable names are listed below. Secrets and real keys are never committed to the repository.

### Backend (`backend/.env`)
| Variable Name | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project REST API endpoint URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase privileged service-role secret |
| `SUPABASE_JWT_SECRET` | Secret key used to decode and verify Supabase Auth JWT tokens |
| `GEMINI_API_KEY` | Google Gemini Vision API key for multimodal document inspection |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origin URLs (e.g. `http://localhost:3000`) |
| `PORT` | Local or production HTTP port (default: `8000`) |
| `ENVIRONMENT` | Runtime environment (`development`, `test`, `production`) |

### Frontend (`frontend/.env.local`)
| Variable Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous Supabase key for client authentication |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the FastAPI backend (`http://localhost:8000/api`) |

---

## 3. Demo Login Details for the Reviewer

The system includes pre-configured deterministic test personas and tokens:

### 1. Company Driver Persona
- **Email:** `driver@transport.com`
- **Password:** `Password123!`
- **Role:** `driver`
- **Name:** Suresh Kumar (MH20 fleet driver)
- **Pre-assigned Trips:** `TRP-66120` (Company B / Cement / Nagpur) and `TRP-66134` (Company C / Steel / Pune)
- **Direct Link:** `http://localhost:3000/driver`

### 2. Billing Executive Persona
- **Email:** `billing@transport.com`
- **Password:** `Password123!`
- **Role:** `billing_executive`
- **Name:** Rajesh Sharma (Chhatrapati Sambhajinagar central office)
- **Access:** Full fleet oversight, review queue, shortage deduction approvals, Tally CSV exports, and daily trip import.
- **Direct Link:** `http://localhost:3000/dashboard`

### 3. Hired Driver Simulated Access (No App Login Required)
- **Truck:** `MH17 BY 3092` (Hired vehicle / Patil Logistics)
- **Trip:** `TRP-66141` (Company D / Packaged foods / Indore)
- **Simulated SMS Token Link:** `http://localhost:3000/upload/hired-driver-token-141`

---

## 4. Production Deployment Topology

- **Frontend:** Vercel or AWS Amplify (Next.js Edge runtime)
- **Backend:** Railway / Render / Google Cloud Run (Containerized FastAPI with Uvicorn)
- **Database, Auth & Storage:** Supabase (Managed PostgreSQL 15, Supabase Auth, and Private Storage bucket `pod-images`)
- **AI Multimodal Verification:** Google Gemini 1.5 Flash via `google-genai` Python SDK
