from pydantic import BaseModel, Field
from typing import List, Optional
from app.schemas.resume import StructuredResume

class JobAnalysisResponse(BaseModel):
    job_title: str
    company_name: Optional[str] = 'Target Company'
    hard_skills: List[str] = Field(default_factory=list, description='Technical and hard skills required')
    soft_skills: List[str] = Field(default_factory=list, description='Soft skills and interpersonal traits')
    key_responsibilities: List[str] = Field(default_factory=list, description='Core duties and responsibilities')
    qualifications: List[str] = Field(default_factory=list, description='Required education or certifications')

class ATSScoreResponse(BaseModel):
    overall_match_score: int = Field(..., ge=0, le=100, description='ATS Match percentage (0-100)')
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    improvement_recommendations: List[str] = Field(default_factory=list)

class TailorRequest(BaseModel):
    raw_resume_text: Optional[str] = None
    structured_resume: Optional[StructuredResume] = None
    job_description_text: str
    target_job_title: Optional[str] = None
    target_company: Optional[str] = None

class TailoredApplicationResponse(BaseModel):
    job_analysis: JobAnalysisResponse
    ats_score: ATSScoreResponse
    tailored_resume: StructuredResume
    cover_letter: str
