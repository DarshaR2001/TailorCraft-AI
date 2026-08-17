Set-Content -Path "README.md" -Value @'
# 🎯 TailorCraft AI — Automated AI Resume & Cover Letter Customization System

TailorCraft AI is an automated resume and cover letter customization backend engineered with **FastAPI**, **PostgreSQL (Supabase)**, and **Alembic**. It performs semantic ATS gap analysis and context-bound CV tailoring to help job seekers generate job-targeted applications without hallucinations.

---

## 🏗️ Architecture & Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend Framework** | FastAPI (Python 3.11+) | Asynchronous API gateway, routing, and Pydantic validation |
| **Database & ORM** | PostgreSQL (Supabase) + SQLAlchemy 2.0 | Async connection pooling with `asyncpg` |
| **Database Migrations** | Alembic | Automatic schema tracking and migrations |
| **Document Parsing** | pdfplumber, python-docx, pypdf | Text extraction from PDF, DOCX, and TXT files |
| **OCR Fallback** | Tesseract OCR + Poppler (`pdf2image`) | Optical Character Recognition for scanned resumes |
| **Web Scraping** | BeautifulSoup4, requests | Direct extraction of job descriptions from web URLs |
| **Authentication** | JWT (JSON Web Tokens) + Passlib (bcrypt) | Secure password hashing and token validation |

---

## 📂 Project Structure

```text
backend/
├── alembic/                      # Database migration scripts & environments
│   ├── versions/                 # Revision versions
│   ├── env.py                    # Async migration engine
│   └── script.py.mako            # Migration template
├── app/
│   ├── api/                      # API endpoints and route definitions
│   │   └── v1/
│   │       └── endpoints/
│   │           ├── auth.py       # Register, login, and user profile management
│   │           └── ingestion.py  # CV and Job Description parsing endpoints
│   ├── core/                     # Core configs, security & settings
│   │   ├── config.py             # Pydantic Settings & environment loader
│   │   └── security.py           # Bcrypt hashing & JWT token generator
│   ├── db/                       # Database engine & session generator
│   │   └── session.py            # AsyncSessionLocal dependency
│   ├── models/                   # SQLAlchemy declarative models
│   │   └── models.py             # User, Application, and DocumentArtifact tables
│   ├── schemas/                  # Pydantic validation schemas
│   │   ├── resume.py             # Structured resume entity schemas
│   │   └── user.py               # User and Auth data contracts
│   ├── services/                 # Business logic and parsing engine
│   │   └── parser_service.py     # PDF/DOCX/TXT parser with OCR fallback
│   └── main.py                   # Application entry point & CORS configuration
├── alembic.ini                   # Alembic configuration
├── requirements.txt              # Project dependencies
└── .env.example                  # Environment configuration template