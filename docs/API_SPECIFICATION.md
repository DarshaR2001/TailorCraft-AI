# REST API Specification & Service Contracts
## Project: TailorCraft AI — Automated Resume & Cover Letter Customization System

---

## 1. Global API Overview

### 1.1 Base URLs
* **Production API Gateway:** `https://tailorcraft.ai/api/v1` (Proxied via Next.js `/api/proxy/*`)
* **Local Development Backend:** `http://127.0.0.1:8000/api/v1`
* **Interactive OpenAPI (Swagger) UI:** `http://127.0.0.1:8000/docs`
* **ReDoc Documentation:** `http://127.0.0.1:8000/redoc`

### 1.2 Authentication Header
All protected endpoints require a standard Bearer Token header:
```http
Authorization: Bearer <jwt_access_token>
```

### 1.3 Standard Error Format
All $4\text{xx}$ and $5\text{xx}$ responses return a normalized JSON payload:
```json
{
  "detail": "Descriptive error message explaining the failure condition."
}
```

---

## 2. Endpoint Matrix

| Method | Path | Description | Auth Required | Content-Type |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/health` | Server liveness & readiness probe | ❌ | `application/json` |
| `POST` | `/api/v1/auth/register` | Create a new user account | ❌ | `application/json` |
| `POST` | `/api/v1/auth/login` | Authenticate user & return JWT token | ❌ | `application/json` |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | ✅ | `application/json` |
| `POST` | `/api/v1/ingest/cv` | Upload and parse `.pdf`, `.docx`, or `.txt` CV | ❌ | `multipart/form-data` |
| `POST` | `/api/v1/ingest/job-description` | Ingest raw JD text or scrape job post URL | ❌ | `application/json` |
| `POST` | `/api/v1/tailor/analyze-job` | Extract keywords & requirements from JD | ❌ | `application/json` |
| `POST` | `/api/v1/tailor/ats-score` | Compute ATS compatibility rating (0–100%) | ❌ | `application/json` |
| `POST` | `/api/v1/tailor/generate` | Run full AI tailoring and persist application | ✅ | `application/json` |
| `POST` | `/api/v1/export/{id}/generate-documents` | Compile PDF and DOCX artifacts | ✅ | `application/json` |
| `GET` | `/api/v1/export/artifacts/{id}/download` | Download artifact by artifact ID | ✅ | `application/octet-stream` |
| `GET` | `/api/v1/export/download/local` | Direct streaming fallback by relative path | ❌ | `application/octet-stream` |

---

## 3. Detailed Endpoint Contracts

### 3.1 Authentication & User Endpoints

#### `POST /api/v1/auth/register`
Creates a new candidate account.

* **Request Body:**
```json
{
  "email": "alex.dev@example.com",
  "password": "SecurePassword123!",
  "full_name": "Alex Dev",
  "headline": "Senior Full-Stack Engineer",
  "phone": "+1 (555) 012-3456",
  "location": "Seattle, WA",
  "linkedin_url": "https://linkedin.com/in/alexdev",
  "github_url": "https://github.com/alexdev"
}
```
* **Success Response (`201 Created`):**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "alex.dev@example.com",
  "full_name": "Alex Dev",
  "headline": "Senior Full-Stack Engineer",
  "phone": "+1 (555) 012-3456",
  "location": "Seattle, WA",
  "linkedin_url": "https://linkedin.com/in/alexdev",
  "github_url": "https://github.com/alexdev",
  "created_at": "2026-08-17T20:00:00Z"
}
```

#### `POST /api/v1/auth/login`
Authenticates credentials and returns a JWT access token.

* **Request Body:**
```json
{
  "email": "alex.dev@example.com",
  "password": "SecurePassword123!"
}
```
* **Success Response (`200 OK`):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "alex.dev@example.com",
    "full_name": "Alex Dev"
  }
}
```

---

### 3.2 Ingestion & Parsing Endpoints

#### `POST /api/v1/ingest/cv`
Uploads a candidate CV file (`.pdf`, `.docx`, `.txt`) and extracts raw text using native parsers or OCR fallback.

* **Request Headers:** `Content-Type: multipart/form-data`
* **Form Parameters:** `file` (Binary file, max 15MB)
* **Success Response (`200 OK`):**
```json
{
  "filename": "Alex_Dev_Resume_2026.pdf",
  "text": "ALEX DEV\nSeattle, WA | alex.dev@example.com\n\nPROFESSIONAL SUMMARY\nFull-Stack Engineer with 6 years...",
  "length": 3412
}
```

#### `POST /api/v1/ingest/job-description`
Ingests a job description via raw pasted text or extracts it by scraping a job post URL.

* **Request Body:**
```json
{
  "url": "https://jobs.lever.co/example/12345",
  "raw_text": null
}
```
* **Success Response (`200 OK`):**
```json
{
  "text": "About the Role: We are looking for a Senior Full-Stack Engineer to lead our frontend architecture...",
  "length": 2180
}
```

---

### 3.3 AI Tailoring & ATS Scoring Endpoints

#### `POST /api/v1/tailor/ats-score`
Evaluates keyword overlap and computes ATS match compatibility.

* **Request Body:**
```json
{
  "resume_text": "Extracted text of candidate resume...",
  "job_description_text": "Extracted text of target job description..."
}
```
* **Success Response (`200 OK`):**
```json
{
  "overall_match_score": 78,
  "matched_skills": ["Python", "FastAPI", "React", "Docker", "SQL"],
  "missing_skills": ["Kubernetes", "GraphQL", "CI/CD Pipeline Design"],
  "improvement_recommendations": [
    "Highlight specific distributed systems projects utilizing FastAPI async workers.",
    "Incorporate measurable container orchestration achievements in experience bullets."
  ]
}
```

#### `POST /api/v1/tailor/generate`
Executes the full anti-hallucination tailoring pipeline and persists the application record to the database.

* **Request Body:**
```json
{
  "raw_resume_text": "Complete candidate CV text...",
  "job_description_text": "Complete target job description...",
  "target_job_title": "Lead Software Engineer",
  "target_company": "Acme Corp"
}
```
* **Success Response (`200 OK`):**
```json
{
  "application_id": "7b2e1f48-a538-4e89-9811-3091c6bf9e21",
  "job_analysis": {
    "job_title": "Lead Software Engineer",
    "company_name": "Acme Corp",
    "hard_skills": ["Python", "TypeScript", "FastAPI", "PostgreSQL"],
    "soft_skills": ["Mentorship", "System Design"],
    "key_responsibilities": ["Lead architectural reviews", "Build scalable services"],
    "qualifications": ["5+ years experience", "B.S. in Computer Science"]
  },
  "ats_score": {
    "overall_match_score": 88,
    "matched_skills": ["Python", "TypeScript", "FastAPI", "PostgreSQL"],
    "missing_skills": ["GraphQL"],
    "improvement_recommendations": ["Emphasize high-volume distributed throughput metrics."]
  },
  "tailored_resume": {
    "contact_info": {
      "full_name": "Alex Dev",
      "email": "alex.dev@example.com",
      "phone": "+1 (555) 012-3456",
      "location": "Seattle, WA",
      "linkedin_url": "https://linkedin.com/in/alexdev",
      "github_url": "https://github.com/alexdev",
      "portfolio_url": null
    },
    "professional_summary": "Lead Software Engineer with 6+ years architecting enterprise FastAPI and Next.js applications...",
    "work_experience": [
      {
        "company_name": "Tech Corp",
        "job_title": "Senior Software Engineer",
        "location": "Seattle, WA",
        "start_date": "2021",
        "end_date": "Present",
        "is_current": true,
        "bullet_points": [
          "Accomplished 35% reduction in API response times by engineering async FastAPI services and query caching.",
          "Led team of 6 engineers to deliver automated deployment pipelines, increasing release velocity by 4x."
        ]
      }
    ],
    "education": [
      {
        "institution": "University of Washington",
        "degree": "B.S. in Computer Science",
        "field_of_study": "Computer Science",
        "graduation_year": "2018",
        "gpa_or_grade": "3.8 / 4.0"
      }
    ],
    "certifications": [],
    "skills": {
      "technical_skills": ["Python", "TypeScript", "FastAPI", "Next.js", "PostgreSQL"],
      "soft_skills": ["Technical Mentorship", "System Design"],
      "tools_and_frameworks": ["Docker", "Git", "Alembic"]
    }
  },
  "cover_letter": "Dear Hiring Team at Acme Corp,\n\nI am writing to express my enthusiasm for the Lead Software Engineer position..."
}
```

---

### 3.4 Multi-Format Export & Download Endpoints

#### `POST /api/v1/export/{application_id}/generate-documents`
Compiles binary PDF and DOCX files for both the tailored Resume and Cover Letter, persisting them to storage.

* **Path Parameter:** `application_id` (UUID)
* **Request Body (Optional edits from workspace):**
```json
{
  "tailored_resume": { ... },
  "cover_letter": "Updated cover letter text..."
}
```
* **Success Response (`200 OK`):**
```json
{
  "application_id": "7b2e1f48-a538-4e89-9811-3091c6bf9e21",
  "job_title": "Lead Software Engineer",
  "company_name": "Acme Corp",
  "artifacts": [
    {
      "artifact_id": "90d18e91-7d12-4211-9a74-4b5188f6a9c1",
      "document_type": "resume_pdf",
      "file_name": "Alex_Dev_Lead_Software_Engineer_Resume.pdf",
      "file_size_bytes": 48120,
      "download_url": "/api/v1/export/download/local?path=storage/7b2e1f48.../resume.pdf"
    },
    {
      "artifact_id": "11a45e33-4f91-4e78-83cd-7c2891d4e5a2",
      "document_type": "resume_docx",
      "file_name": "Alex_Dev_Lead_Software_Engineer_Resume.docx",
      "file_size_bytes": 31405,
      "download_url": "/api/v1/export/download/local?path=storage/7b2e1f48.../resume.docx"
    },
    {
      "artifact_id": "33c89b71-12a4-47b1-bcf3-9e12049182aa",
      "document_type": "cover_letter_pdf",
      "file_name": "Alex_Dev_Acme_Corp_Cover_Letter.pdf",
      "file_size_bytes": 39800,
      "download_url": "/api/v1/export/download/local?path=storage/7b2e1f48.../cover_letter.pdf"
    },
    {
      "artifact_id": "44d90e88-33b1-4822-a90f-019842aab119",
      "document_type": "cover_letter_docx",
      "file_name": "Alex_Dev_Acme_Corp_Cover_Letter.docx",
      "file_size_bytes": 28910,
      "download_url": "/api/v1/export/download/local?path=storage/7b2e1f48.../cover_letter.docx"
    }
  ]
}
```

#### `GET /api/v1/export/download/local`
Streams the binary file directly to the client.

* **Query Parameters:** `path` (Storage relative path)
* **Response:** Stream with `Content-Type: application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document` and `Content-Disposition: attachment; filename="..."`.
