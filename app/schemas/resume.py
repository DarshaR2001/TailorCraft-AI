from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

class ContactInfo(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None

class WorkExperience(BaseModel):
    company_name: str
    job_title: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    bullet_points: List[str] = Field(default_factory=list)

class Education(BaseModel):
    institution: str
    degree: str
    field_of_study: Optional[str] = None
    graduation_year: Optional[str] = None
    gpa_or_grade: Optional[str] = None

class Certification(BaseModel):
    name: str
    issuing_organization: Optional[str] = None
    issue_date: Optional[str] = None
    credential_id: Optional[str] = None

class Skills(BaseModel):
    technical_skills: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)
    tools_and_frameworks: List[str] = Field(default_factory=list)

class StructuredResume(BaseModel):
    contact_info: ContactInfo
    professional_summary: Optional[str] = None
    work_experience: List[WorkExperience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    certifications: List[Certification] = Field(default_factory=list)
    skills: Skills = Field(default_factory=Skills)
