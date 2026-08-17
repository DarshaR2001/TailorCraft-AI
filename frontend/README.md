# 💻 TailorCraft AI — Frontend Workspace

> **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 UI & Real-Time Workspace**

The **TailorCraft AI Frontend** provides an interactive, responsive dual-panel workspace where users can upload resumes, scrape/paste job descriptions, visualize ATS match metrics, live-edit AI-tailored sections with the XYZ formula, and export styled PDF/DOCX documents.

---

## 🏗️ Architecture & Core Concepts

### 1. Dual-Panel Workspace Flow
- **Left Panel (Ingestion & Controls):**
  - **Resume Uploader:** Drag-and-drop file upload with animated SVG circular progress indicators and file chips.
  - **Job Description Input:** Multi-tab view supporting direct text pasting and URL scraping.
  - **ATS Score Gauge:** Radial SVG meter with count-up animations, overall score (0–100%), and green/amber/red skill badges.
  - **AI Tailoring Action:** Single-click generation trigger with loading state and auth guards.
- **Right Panel (Interactive Editors & Export):**
  - **Tailored Resume Editor:** Accordion sections for Professional Summary, Work Experience (with inline XYZ formula bullet editor, add/delete actions), and interactive tag-chip Skills editors.
  - **Cover Letter Editor:** Live text editor with real-time word counter and guidance indicators (250–400 words target).
  - **Export Bar:** One-click PDF and DOCX generation with celebration confetti (`canvas-confetti`) and individual download progress states.

### 2. Next.js Server-Side CORS Proxy
To eliminate cross-origin issues during local and production development, the client communicates with the backend via a catch-all route at:
```
/api/proxy/[...path]  ──►  http://127.0.0.1:8000/api/v1/[...path]
```
- Forwards `Authorization`, `Content-Type`, and `Accept` headers.
- Handles `multipart/form-data` file uploads seamlessly.
- Directly streams binary buffers (`application/pdf`, `application/vnd.openxmlformats-...`, `application/octet-stream`) to the browser.
- Configured with `maxDuration = 300s` and a 270s `AbortController` timeout for complex LLM inference tasks.

### 3. State Management & Data Flow
- **`useWorkflow.ts`:** Global state machine governing the 4-step user journey (`1: Ingestion` ➔ `2: Job Spec` ➔ `3: Tailoring` ➔ `4: Export`). Uses `useRef` to maintain fresh state references across async API calls.
- **`AuthContext.tsx`:** Modal-driven JWT authentication state with local storage persistence and automated modal prompt on 401 expiration.
- **`Toast.tsx`:** Singleton toast system supporting `success`, `error`, `loading`, and `info` alerts with auto-clearing logic for in-flight tasks.

---

## 📂 Directory Structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── api/proxy/[...path]/  # Next.js serverless CORS proxy
│   │   │   └── route.ts
│   │   ├── globals.css           # Tailwind CSS v4 design tokens & base styles
│   │   ├── layout.tsx            # Global layout with Inter font and AuthProvider
│   │   └── page.tsx              # Main dual-panel workspace assembly
│   ├── components/
│   │   ├── analytics/
│   │   │   └── AtsScoreGauge.tsx         # SVG radial score gauge & skill tags
│   │   ├── export/
│   │   │   └── ExportBar.tsx             # PDF/DOCX generation & download buttons
│   │   ├── ingestion/
│   │   │   ├── JobDescriptionInput.tsx   # Text paste & URL scraper tabs
│   │   │   └── ResumeUploader.tsx        # Drag-and-drop file uploader
│   │   ├── ui/
│   │   │   ├── AuthModal.tsx             # Inline login/registration dialog
│   │   │   ├── Header.tsx                # Frosted-glass header & user pill
│   │   │   ├── StepIndicator.tsx         # Animated 4-step progress tracker
│   │   │   └── Toast.tsx                 # Global toast notifications
│   │   └── workspace/
│   │       ├── CoverLetterEditor.tsx     # Live cover letter editor with word counter
│   │       └── TailoredResumeEditor.tsx  # Accordion resume editor with XYZ bullets
│   ├── context/
│   │   └── AuthContext.tsx       # JWT authentication provider & user state
│   ├── hooks/
│   │   └── useWorkflow.ts        # Central workflow state machine
│   ├── lib/
│   │   └── api.ts                # Axios client with JWT interceptor & 5m timeout
│   └── types/
│       └── index.ts              # TypeScript interfaces mirroring Pydantic schemas
├── package.json
└── tsconfig.json
```

---

## 🎨 Design System & Styling

The UI is built with **Tailwind CSS v4** featuring a curated dark-mode-first aesthetic:
- **Base Background:** `#0d0f14`
- **Surface Elevation:** `#161b22` / `#1e2430`
- **Brand Accent:** Violet (`hsl(258, 90%, 66%)`) with smooth linear gradients
- **Semantic Colors:** Emerald green (matched/success), amber (warning), rose (error)
- **Typography:** `Inter` variable font with strict optical hierarchy
- **Glassmorphism:** Frosted-glass overlays using backdrop filters

---

## 🛠️ Available Scripts

In the `frontend` directory, you can run:

### `npm run dev`
Starts the Next.js development server on [http://localhost:3000](http://localhost:3000) with Turbopack and hot module reloading.

### `npm run build`
Compiles and builds the application for production. Validates all TypeScript types and generates optimized static and server-rendered routes.

### `npm run start`
Runs the compiled production server.

### `npm run lint`
Runs ESLint to detect and report code quality issues.

---

## ⚙️ Environment Configuration

By default, the proxy forwards to `http://127.0.0.1:8000/api/v1`. To override this (e.g. in staging or production), create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL="http://127.0.0.1:8000/api/v1"
```

---

## 🧪 Testing & Validation Workflow

1. **Upload:** Drop a sample `.pdf` or `.docx` resume on the left panel.
2. **Job Spec:** Paste a target job description or input a live job posting URL.
3. **ATS Match:** Click **Analyze ATS Match** to view keyword match percentages and missing recommendations.
4. **Tailor:** Click **Generate Tailored Application** (sign in via the prompt if needed).
5. **Edit:** Refine the generated bullet points and cover letter in the right panel.
6. **Export:** Click **Generate PDF & DOCX Documents** and download your customized files.
