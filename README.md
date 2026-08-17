# 🎯 TailorCraft AI

> **Automated AI Resume & Cover Letter Customization System**  
> Context-bound, anti-hallucination resume tailoring and ATS optimization platform engineered with **Next.js 16**, **FastAPI**, **PostgreSQL (Supabase)**, and **OpenRouter LLMs**.

---

## 🌟 Overview

**TailorCraft AI** bridges the gap between job seekers and Applicant Tracking Systems (ATS). By analyzing original resumes against target job descriptions, TailorCraft AI generates tailored, ATS-compliant resumes using Google's **XYZ Formula** (*"Accomplished [X] as measured by [Y], by doing [Z]"*) along with custom-crafted, personalized cover letters — and exports them directly into styled **PDF** and **DOCX** files.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               TAILORCRAFT AI WORKSPACE                                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   [ 1. Upload CV ] ────► [ 2. Job Description ] ────► [ 3. AI Tailor ] ────► [ 4. Export ]│
│   • Drag & Drop PDF/DOCX • Paste text or URL scrape   • ATS keyword match    • PDF & DOCX│
│   • OCR extraction fallback                           • XYZ bullet points    • 1-Click Dl│
│                                                       • 4-Para cover letter  • Confetti! │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client["Next.js 16 Frontend (App Router, Tailwind v4)"]
    Proxy["Next.js Proxy (/api/proxy/[...path])"]
    FastAPI["FastAPI Backend (Python 3.11+)"]
    DB[(PostgreSQL / Supabase)]
    LLM["OpenRouter LLM Gateway (Nemotron / Gemini)"]
    Storage["Artifact Storage (Local / S3 / R2)"]

    Client -->|Internal API Calls| Proxy
    Proxy -->|Server-to-Server (CORS Bypass)| FastAPI
    FastAPI -->|Async SQLAlchemy / asyncpg| DB
    FastAPI -->|Async Chat Completions| LLM
    FastAPI -->|Save PDF/DOCX Artifacts| Storage
    FastAPI -->|Stream Document Blobs| Proxy
    Proxy -->|Binary Stream| Client
```

---

## ⚡ Key Features

- **Multi-Format CV Ingestion:** High-fidelity text extraction from `.pdf`, `.docx`, and `.txt` using `pdfplumber` and `pypdf`, with OCR fallback via `pdf2image` + `pytesseract`.
- **Live Job Description Scraping:** Ingest job specs by pasting raw text or providing a URL scraped with `BeautifulSoup4`.
- **ATS Gap Analysis & Scoring:** Radial SVG gauge with live count-up animation, computing match score (0–100%), matched skills, and missing keyword recommendations.
- **Context-Bound AI Tailoring:** Strict anti-hallucination guardrails enforcing factual accuracy, rewriting experience bullets via the XYZ formula.
- **Interactive Dual-Panel Workspace:**
  - Full-featured **Resume Editor** with accordion sections for Summary, Experience (inline XYZ bullet points), and keyboard-friendly Skill tags.
  - Live **Cover Letter Editor** with real-time word count and optimal length indicators (250–400 words).
- **Pixel-Perfect Document Export:** In-memory generation of styled **PDF** (ReportLab) and **DOCX** (`python-docx`) files for both Resume and Cover Letter.
- **JWT Authentication & Profile Management:** Modal-based authentication with auto-refresh and secure Bearer token handling.

---

## 🛠️ Technology Stack

### Frontend
| Component | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | Server and Client components, SSR, and API route proxies |
| **Language** | TypeScript 5 | End-to-end typed contracts mirroring backend schemas |
| **Styling** | Tailwind CSS v4 | Dark-mode-first HSL token design system and glassmorphism |
| **Icons** | Lucide React | Clean, scalable vector icons |
| **HTTP Client** | Axios | Request interceptors, JWT injection, and custom timeout handling |
| **Effects** | Canvas-Confetti | Micro-animations and celebration feedback on document export |

### Backend
| Component | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | FastAPI | High-performance async Python web framework with auto OpenAPI docs |
| **Database** | PostgreSQL (Supabase) | Async connection pooling with SQLAlchemy 2.0 and `asyncpg` |
| **Migrations** | Alembic | Version-controlled declarative schema migrations |
| **LLM Gateway** | OpenRouter (`AsyncOpenAI`) | High-capacity reasoning models (`nvidia/nemotron-3-ultra-550b`, `google/gemini`) |
| **Document Generation** | ReportLab & `python-docx` | Binary buffer PDF/DOCX compilation |
| **Auth & Security** | JWT + Passlib (bcrypt) | Secure token-based user authentication and password hashing |

---

## 📂 Repository Structure

```text
TailorCraft-AI/
├── backend/
│   ├── alembic/                  # Database migration scripts & version tracking
│   ├── app/
│   │   ├── api/v1/endpoints/     # REST Endpoints (auth, ingestion, tailor, export)
│   │   ├── core/                 # App configuration & security settings
│   │   ├── db/                   # Database session management
│   │   ├── models/               # SQLAlchemy ORM models (User, Application, Artifact)
│   │   ├── schemas/              # Pydantic validation models
│   │   ├── services/             # Core business logic (LLM, parser, storage, docs)
│   │   └── main.py               # FastAPI entry point & CORS configuration
│   ├── storage/                  # Local artifact storage (development fallback)
│   ├── requirements.txt          # Python package dependencies
│   └── .env.example              # Backend environment template
│
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router (pages, layout, proxy routes)
│   │   │   ├── api/proxy/        # Server-side proxy to bypass CORS
│   │   │   ├── globals.css       # Design tokens & component styles
│   │   │   ├── layout.tsx        # Root layout & providers
│   │   │   └── page.tsx          # Main interactive workspace
│   │   ├── components/           # Modular React components
│   │   │   ├── analytics/        # ATS Gauge & keyword badges
│   │   │   ├── export/           # ExportBar & document download handlers
│   │   │   ├── ingestion/        # Resume uploader & Job description input
│   │   │   ├── ui/               # Header, StepIndicator, Toast, AuthModal
│   │   │   └── workspace/        # TailoredResumeEditor, CoverLetterEditor
│   │   ├── context/              # AuthContext & global state
│   │   ├── hooks/                # useWorkflow state machine
│   │   ├── lib/                  # Axios API client instance
│   │   └── types/                # TypeScript schemas mirroring backend models
│   ├── package.json              # Frontend dependencies
│   └── tsconfig.json             # TypeScript configuration
│
└── README.md                     # Main project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18.18+ or 20+
- **Python** 3.11+
- **PostgreSQL** instance (or free Supabase project)
- **OpenRouter API Key** (for LLM inference)

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Edit `backend/.env` with your credentials:
```env
PROJECT_NAME="TailorCraft AI"
API_V1_STR="/api/v1"
DATABASE_URL="postgresql+asyncpg://<USER>:<PASSWORD>@<HOST>:5432/<DB_NAME>?ssl=require"
SECRET_KEY="YOUR_SUPER_SECRET_JWT_KEY"
DEEPSEEK_API_KEY="YOUR_OPENROUTER_API_KEY"
DEEPSEEK_BASE_URL="https://openrouter.ai/api/v1"
DEEPSEEK_MODEL="nvidia/nemotron-3-ultra-550b-a55b:free"
```

Run database migrations and start the server:
```bash
# Run migrations
alembic upgrade head

# Start FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Backend will be live at: `http://127.0.0.1:8000` (Docs at `http://127.0.0.1:8000/docs`).

---

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to frontend
cd frontend

# Install Node dependencies
npm install

# Start the Next.js development server
npm run dev
```
Frontend will be live at: `http://localhost:3000`.

---

## 📡 API Endpoint Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/auth/register` | Register a new user | ❌ |
| `POST` | `/api/v1/auth/login` | Login and receive JWT access token | ❌ |
| `GET` | `/api/v1/auth/me` | Get current user profile | ✅ |
| `POST` | `/api/v1/ingest/cv` | Upload and parse CV (PDF, DOCX, TXT) | ❌ |
| `POST` | `/api/v1/ingest/job-description` | Ingest job description from text or URL | ❌ |
| `POST` | `/api/v1/tailor/ats-score` | Calculate ATS match score & keyword delta | ❌ |
| `POST` | `/api/v1/tailor/generate` | Run full AI tailoring pipeline | ✅ |
| `POST` | `/api/v1/export/{id}/generate-documents` | Generate PDF and DOCX artifacts | ✅ |
| `GET` | `/api/v1/export/artifacts/{id}/download` | Download single artifact | ✅ |
| `GET` | `/api/v1/export/download/local` | Local storage binary download fallback | ❌ |

---

## 📄 License

This project is licensed under the MIT License.
