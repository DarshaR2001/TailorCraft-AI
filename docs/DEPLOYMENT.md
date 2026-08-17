# Deployment Guide, Docker & CI/CD Pipeline
## Project: TailorCraft AI — Automated Resume & Cover Letter Customization System

---

## 1. Cloud Infrastructure & Hosting Topology

TailorCraft AI is designed for modern cloud container deployment with edge static acceleration:

```mermaid
flowchart TD
    subgraph ClientBrowsers["Client Browsers"]
        Browser["User Browser / Mobile"]
    end

    subgraph CDNLayer["Vercel / Cloudflare Edge CDN"]
        NextFrontend["Next.js 16 Static & SSR App"]
        NextProxy["Edge Server Proxy (/api/proxy/*)"]
    end

    subgraph ContainerService["Backend App Cluster (AWS ECS / Render / Railway)"]
        FastAPI1["FastAPI Worker 1 (Uvicorn)"]
        FastAPI2["FastAPI Worker 2 (Uvicorn)"]
        LoadBalancer["Application Load Balancer"]
        LoadBalancer --> FastAPI1
        LoadBalancer --> FastAPI2
    end

    subgraph ManagedCloudData["Managed Cloud Services"]
        SupabaseDB[(Supabase Managed PostgreSQL 15+)]
        S3Storage[("AWS S3 / Supabase Storage (PDF/DOCX)")]
        OpenRouterAPI["OpenRouter AI Gateway"]
    end

    Browser --> CDNLayer
    NextProxy -->|HTTPS| LoadBalancer
    FastAPI1 & FastAPI2 -->|SSL Pooling (asyncpg)| SupabaseDB
    FastAPI1 & FastAPI2 -->|S3 SDK| S3Storage
    FastAPI1 & FastAPI2 -->|HTTPS API| OpenRouterAPI
```

---

## 2. Docker Containerization

### 2.1 Backend Multi-Stage `Dockerfile` (`backend/Dockerfile`)
```dockerfile
# Stage 1: Build stage with build dependencies
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Minimal runtime stage
FROM python:3.11-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local
COPY . .

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

EXPOSE 8000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### 2.2 Frontend Multi-Stage `Dockerfile` (`frontend/Dockerfile`)
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

### 2.3 `docker-compose.yml` (Local Full-Stack Orchestration)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: tailorcraft-db
    environment:
      POSTGRES_USER: tailorcraft_user
      POSTGRES_PASSWORD: tailorcraft_password
      POSTGRES_DB: tailorcraft_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tailorcraft_user -d tailorcraft_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tailorcraft-backend
    environment:
      - PROJECT_NAME=TailorCraft AI
      - API_V1_STR=/api/v1
      - DATABASE_URL=postgresql+asyncpg://tailorcraft_user:tailorcraft_password@postgres:5432/tailorcraft_db
      - SECRET_KEY=your-production-secret-jwt-key
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - DEEPSEEK_BASE_URL=https://openrouter.ai/api/v1
      - DEEPSEEK_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend/storage:/app/storage

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: tailorcraft-frontend
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## 3. Environment Variables & Secrets Configuration

### 3.1 Backend Configuration (`backend/.env`)
| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `PROJECT_NAME` | No | `TailorCraft AI` | OpenAPI title and application name |
| `API_V1_STR` | No | `/api/v1` | Root API route prefix |
| `DATABASE_URL` | Yes | `postgresql+asyncpg://<usr>:<pwd>@<host>:5432/<db>?ssl=require` | Async SQLAlchemy PostgreSQL connection string |
| `SECRET_KEY` | Yes | `openssl rand -hex 32` | JWT HMAC-SHA256 signature secret key |
| `DEEPSEEK_API_KEY` | Yes | `sk-or-v1-xxxxxxxxxxxx` | OpenRouter API authentication key |
| `DEEPSEEK_BASE_URL`| No | `https://openrouter.ai/api/v1` | OpenRouter chat completions endpoint |
| `DEEPSEEK_MODEL` | No | `nvidia/nemotron-3-ultra-550b-a55b:free` | Model tag for resume tailoring & JSON inference |

### 3.2 Frontend Configuration (`frontend/.env.local`)
| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | No | `http://127.0.0.1:8000` | Backend API URL target for server-side proxy |

---

## 4. Automated CI/CD Pipeline (GitHub Actions)

Workflow file: `.github/workflows/ci-cd.yml`

```yaml
name: TailorCraft AI CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-test:
    name: Backend Test & Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"
      - name: Install System Dependencies
        run: sudo apt-get update && sudo apt-get install -y tesseract-ocr poppler-utils
      - name: Install Python Dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov
      - name: Run Backend Pytest Suite
        run: |
          cd backend
          pytest -v --cov=app

  frontend-test:
    name: Frontend Lint & Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json
      - name: Install Node Dependencies
        run: |
          cd frontend
          npm ci
      - name: Type Check & Build
        run: |
          cd frontend
          npm run build
```

---

## 5. Production Health Monitoring & Observability

* **Health Probe (`/health`):** Returns HTTP 200 with JSON payload `{"status": "healthy", "service": "TailorCraft AI Backend"}`.
* **Structured Access Logging:** Standard Uvicorn structured JSON logging capturing request latency, status code, and client IP.
* **Database Connection Pool Sizing:** Configured with `pool_size=20`, `max_overflow=10`, and `pool_recycle=3600` in `app/db/session.py` to prevent connection starvation under high concurrent traffic.
