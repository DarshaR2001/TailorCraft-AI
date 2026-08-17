from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.ai import TailorRequest, JobAnalysisResponse, ATSScoreResponse, TailoredApplicationResponse, AnalyzeJobRequest, ATSScoreRequest
from app.services.llm_service import LLMService
from app.db.session import get_db
from app.models.models import Application, User
from app.api.v1.endpoints.auth import get_current_user
from typing import Optional

router = APIRouter(prefix="/tailor", tags=["AI Tailoring Engine"])

@router.post("/analyze-job", response_model=JobAnalysisResponse)
async def analyze_job(payload: AnalyzeJobRequest):
    jd_text = payload.job_description_text
    llm = LLMService()
    return await llm.analyze_job_description(jd_text)

@router.post("/ats-score", response_model=ATSScoreResponse)
async def get_ats_score(payload: ATSScoreRequest):
    llm = LLMService()
    return await llm.calculate_ats_match(payload.resume_text, payload.job_description_text)

@router.post("/generate", response_model=TailoredApplicationResponse)
async def generate_tailored_application(
    payload: TailorRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Resolve resume text from whichever field was provided
    resume_text = payload.raw_resume_text or ""
    if not resume_text and payload.structured_resume:
        resume_text = payload.structured_resume.model_dump_json()

    if not resume_text:
        raise HTTPException(status_code=400, detail="Must provide either 'raw_resume_text' or 'structured_resume'.")

    # Resolve optional hints BEFORE calling the LLM (fixes NameError — 'result' doesn't exist yet)
    job_title_hint = payload.target_job_title or ""
    company_hint = payload.target_company or ""

    llm = LLMService()
    result = await llm.tailor_application(
        resume_text=resume_text,
        jd_text=payload.job_description_text,
        job_title=job_title_hint,
        company=company_hint,
    )

    # Persist the application in PostgreSQL
    new_application = Application(
        user_id=current_user.id,
        job_title=result.job_analysis.job_title or job_title_hint or "Target Role",
        company_name=result.job_analysis.company_name or company_hint or "Target Company",
        job_description_raw=payload.job_description_text,
        extracted_keywords=result.job_analysis.model_dump(),
        ats_match_score=result.ats_score.overall_match_score,
        status="Generated",
    )
    db.add(new_application)
    await db.commit()
    await db.refresh(new_application)

    return result

