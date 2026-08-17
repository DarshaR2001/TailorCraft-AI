// ============================================================
// TailorCraft AI — TypeScript Interfaces
// Mirrors FastAPI/Pydantic schemas exactly
// ============================================================

// ----------- Auth -----------
export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

// ----------- Resume Structures -----------
export interface ContactInfo {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
}

export interface WorkExperience {
  company_name: string;
  job_title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  bullet_points: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field_of_study?: string | null;
  graduation_year?: string | null;
  gpa_or_grade?: string | null;
}

export interface Certification {
  name: string;
  issuing_organization?: string | null;
  issue_date?: string | null;
  credential_id?: string | null;
}

export interface Skills {
  technical_skills: string[];
  soft_skills: string[];
  tools_and_frameworks: string[];
}

export interface StructuredResume {
  contact_info: ContactInfo;
  professional_summary?: string | null;
  work_experience: WorkExperience[];
  education: Education[];
  certifications: Certification[];
  skills: Skills;
}

// ----------- Ingestion -----------
export interface ParseCVResponse {
  filename: string;
  content_type: string;
  file_size_bytes: number;
  raw_text: string;
}

export interface JobDescriptionRequest {
  text?: string;
  url?: string;
}

export interface JobDescriptionResponse {
  source_type: string;
  raw_text: string;
}

// ----------- AI / Tailoring -----------
export interface JobAnalysisResponse {
  job_title: string;
  company_name: string;
  hard_skills: string[];
  soft_skills: string[];
  key_responsibilities: string[];
  qualifications: string[];
}

export interface ATSScoreResponse {
  overall_match_score: number; // 0–100
  matched_skills: string[];
  missing_skills: string[];
  improvement_recommendations: string[];
}

export interface TailoredApplicationResponse {
  job_analysis: JobAnalysisResponse;
  ats_score: ATSScoreResponse;
  tailored_resume: StructuredResume;
  cover_letter: string;
  application_id?: string;
}

// ----------- Export / Artifacts -----------
export interface DocumentArtifact {
  artifact_id: string;
  document_type: "CV_PDF" | "CV_DOCX" | "COVER_LETTER_PDF" | "COVER_LETTER_DOCX";
  file_name: string;
  file_size_bytes?: number | null;
  download_url?: string | null;
}

export interface GenerateDocumentsResponse {
  application_id: string;
  job_title: string;
  company_name: string;
  artifacts: DocumentArtifact[];
}

// ----------- UI State -----------
export type WorkflowStep = 1 | 2 | 3 | 4;

export type ToastType = "success" | "error" | "loading" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}
