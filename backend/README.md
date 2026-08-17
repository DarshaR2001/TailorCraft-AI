# 🎯 TailorCraft AI — Backend Service

> **FastAPI + PostgreSQL (Supabase) + Alembic + OpenRouter LLMs + ReportLab / python-docx**

The **TailorCraft AI Backend** provides a high-performance, asynchronous REST API for parsing multi-format resumes, scraping job descriptions, running ATS semantic matching, orchestrating anti-hallucination AI resume/cover-letter tailoring, and generating ATS-optimized PDF and DOCX documents.

---

## 🏗️ Architecture & Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend Framework** | FastAPI (Python 3.11+) | Asynchronous API gateway, OpenAPI 3.1 docs, Pydantic v2 validation |
| **Database & ORM** | PostgreSQL (Supabase) + SQLAlchemy 2.0 | Async connection pooling with `asyncpg` |
| **Database Migrations** | Alembic | Version-controlled declarative schema migrations |
| **Document Parsing** | `pdfplumber`, `python-docx`, `pypdf` | High-fidelity text extraction from PDF, DOCX, and TXT |
| **OCR Fallback** | Tesseract OCR + Poppler (`pdf2image`) | Optical Character Recognition for scanned resumes |
| **Web Scraping** | `BeautifulSoup4`, `requests` | Live text extraction from job posting URLs |
| **LLM Orchestration** | OpenRouter (`AsyncOpenAI`) | High-capacity reasoning models (`nvidia/nemotron-3-ultra-550b`, `google/gemini`) |
| **Document Compilation** | `ReportLab`, `python-docx` | Binary buffer rendering of styled PDF and DOCX files |
| **Authentication** | JWT (JSON Web Tokens) + Passlib (bcrypt) | Secure password hashing and bearer token authorization |
| **Storage Engine** | Local Storage & S3/R2 Compatible | Document artifact persistence and presigned URL delivery |

---

## 📂 Directory Structure

```text
backend/
├── alembic/                      # Database migration scripts & environments
│   ├── versions/                 # Revision versions
│   ├── env.py                    # Async migration engine
│   └── script.py.mako            # Migration template
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── endpoints/
│   │           ├── auth.py       # Register, login, and user profile management
│   │           ├── export.py     # Document compilation & download endpoints
│   │           ├── ingestion.py  # CV upload & Job Description scraping
│   │           └── tailor.py     # ATS scoring & AI tailoring generation
│   ├── core/
│   │   ├── config.py             # Pydantic Settings & environment loader
│   │   └── security.py           # Bcrypt hashing & JWT token generator
│   ├── db/
│   │   └── session.py            # AsyncSession engine & sessionmaker
│   ├── models/
│   │   └── models.py             # SQLAlchemy models (User, Application, Artifact)
│   ├── schemas/
│   │   ├── ai.py                 # AI request/response validation contracts
│   │   ├── resume.py             # Structured resume schemas
│   │   └── user.py               # User and Auth data contracts
│   ├── services/
│   │   ├── document_service.py   # ReportLab PDF & python-docx generator
│   │   ├── llm_service.py        # OpenRouter client with prompt guardrails
│   │   ├── parser_service.py     # PDF/DOCX/TXT parser with OCR fallback
│   │   └── storage_service.py    # Local & S3/R2 artifact storage manager
│   └── main.py                   # FastAPI entry point & CORS configuration
├── storage/                      # Local artifact storage (development fallback)
├── alembic.ini                   # Alembic configuration
├── requirements.txt              # Project dependencies
└── .env.example                  # Environment variables template
```

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PROJECT_NAME="TailorCraft AI"
API_V1_STR="/api/v1"

# Database Connection (Supabase / PostgreSQL)
DATABASE_URL="postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:5432/[DATABASE]?ssl=require"

# Security
SECRET_KEY="YOUR_SUPER_SECRET_JWT_KEY"

# OpenRouter LLM Configuration
DEEPSEEK_API_KEY="sk-or-v1-YOUR_OPENROUTER_KEY"
DEEPSEEK_BASE_URL="https://openrouter.ai/api/v1"
DEEPSEEK_MODEL="nvidia/nemotron-3-ultra-550b-a55b:free"

# Optional Cloud Storage (S3 / Cloudflare R2)
S3_BUCKET_NAME="tailorcraft-artifacts"
S3_ENDPOINT_URL=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
```

---

## 🚀 Setup & Execution

```bash
# 1. Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Apply database migrations
alembic upgrade head

# 4. Start the server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Interactive API documentation will be available at:
- **Swagger UI:** `http://127.0.0.1:8000/docs`
- **ReDoc:** `http://127.0.0.1:8000/redoc`

---

## 📡 API Endpoints

### 🔐 Authentication (`/api/v1/auth`)
- `POST /register` — Register a new account
- `POST /login` — Authenticate and receive a JWT Bearer token
- `GET /me` — Retrieve the authenticated user profile

### 📄 Document Ingestion (`/api/v1/ingest`)
- `POST /cv` — Upload and parse a `.pdf`, `.docx`, or `.txt` resume
- `POST /job-description` — Ingest a job description via raw text or web URL

### 🤖 AI Tailoring Engine (`/api/v1/tailor`)
- `POST /analyze-job` — Extract hard/soft skills and responsibilities from a job spec
- `POST /ats-score` — Compute ATS match percentage (0–100%) and keyword breakdown
- `POST /generate` — Execute the full context-bound resume & cover letter tailoring pipeline

### 📥 Document Export Engine (`/api/v1/export`)
- `POST /{application_id}/generate-documents` — Compile styled PDF and DOCX documents
- `GET /artifacts/{artifact_id}/download` — Get download URL for an artifact
- `GET /download/local` — Direct binary stream for local storage fallback
