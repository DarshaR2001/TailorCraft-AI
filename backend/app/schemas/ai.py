from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.resume import StructuredResume


# --- Job Analysis Schemas ---
class JobAnalysisRequest(BaseModel):
    job_description_text: str = Field(..., min_length=20)


class JobAnalysisResponse(BaseModel):
    job_title: str
    company_name: str
    hard_skills: List[str]
    soft_skills: List[str]
    key_responsibilities: List[str]
    qualifications: List[str]


# --- ATS Match Scoring Schemas ---
class ATSScoreRequest(BaseModel):
    resume_text: str = Field(..., min_length=20)
    job_description_text: str = Field(..., min_length=20)


class ATSScoreResponse(BaseModel):
    overall_match_score: int = Field(..., ge=0, le=100)
    matched_skills: List[str]
    missing_skills: List[str]
    improvement_recommendations: List[str]


# --- End-to-End Application Tailoring Schemas ---
class TailorApplicationRequest(BaseModel):
    raw_resume_text: str = Field(..., min_length=20)
    job_description_text: str = Field(..., min_length=20)
    target_job_title: Optional[str] = None
    target_company: Optional[str] = None


class TailoredApplicationResponse(BaseModel):
    job_analysis: JobAnalysisResponse
    ats_score: ATSScoreResponse
    tailored_resume: StructuredResume
    cover_letter: str
