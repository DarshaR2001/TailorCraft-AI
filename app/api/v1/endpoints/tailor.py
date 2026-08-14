from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.ai import TailorRequest, JobAnalysisResponse, ATSScoreResponse, TailoredApplicationResponse
from app.services.llm_service import LLMService
from app.db.session import get_db
from app.models.models import Application, User
from app.api.v1.endpoints.auth import get_current_user
from typing import Optional

router = APIRouter(prefix="/tailor", tags=["AI Tailoring Engine"])

@router.post("/analyze-job", response_model=JobAnalysisResponse)
async def analyze_job(payload: dict):
    jd_text = payload.get("job_description_text", "")
    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description text cannot be empty.")
    llm = LLMService()
    return await llm.analyze_job_description(jd_text)

@router.post("/ats-score", response_model=ATSScoreResponse)
async def get_ats_score(payload: dict):
    resume_text = payload.get("resume_text", "")
    jd_text = payload.get("job_description_text", "")
    if not resume_text or not jd_text:
        raise HTTPException(status_code=400, detail="Both 'resume_text' and 'job_description_text' are required.")
    llm = LLMService()
    return await llm.calculate_ats_match(resume_text, jd_text)

@router.post("/generate", response_model=TailoredApplicationResponse)
async def generate_tailored_application(
    payload: TailorRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    resume_text = payload.raw_resume_text or ""
    if not resume_text and payload.structured_resume:
        resume_text = payload.structured_resume.model_dump_json()
        
    if not resume_text:
        raise HTTPException(status_code=400, detail="Must provide either 'raw_resume_text' or 'structured_resume'.")

    llm = LLMService()
    result = await llm.tailor_application(
        resume_text=resume_text,
        jd_text=payload.job_description_text,
        job_title=payload.target_job_title or result.job_analysis.job_title if 'result' in locals() else '',
        company=payload.target_company or ''
    )

    # Persist the application in PostgreSQL
    new_application = Application(
        user_id=current_user.id,
        job_title=result.job_analysis.job_title or (payload.target_job_title or "Target Role"),
        company_name=result.job_analysis.company_name or (payload.target_company or "Target Company"),
        job_description_raw=payload.job_description_text,
        extracted_keywords=result.job_analysis.model_dump(),
        ats_match_score=result.ats_score.overall_match_score,
        status="Generated"
    )
    db.add(new_application)
    await db.commit()
    await db.refresh(new_application)

    return result
