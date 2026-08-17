from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.models import User, Application
from app.api.v1.endpoints.auth import get_current_user
from app.services.llm_service import LLMService
from app.schemas.ai import (
    JobAnalysisRequest,
    JobAnalysisResponse,
    ATSScoreRequest,
    ATSScoreResponse,
    TailorApplicationRequest,
    TailoredApplicationResponse,
)

router = APIRouter(prefix="/tailor", tags=["AI Tailoring Engine"])
llm_service = LLMService()


@router.post("/analyze-job", response_model=JobAnalysisResponse)
async def analyze_job(payload: JobAnalysisRequest):
    return await llm_service.analyze_job_description(payload.job_description_text)


@router.post("/ats-score", response_model=ATSScoreResponse)
async def get_ats_score(payload: ATSScoreRequest):
    return await llm_service.calculate_ats_match(payload.resume_text, payload.job_description_text)


@router.post("/generate", response_model=TailoredApplicationResponse)
async def generate_tailored_application(
    payload: TailorApplicationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await llm_service.tailor_application(
        resume_text=payload.raw_resume_text,
        jd_text=payload.job_description_text,
        job_title=payload.target_job_title or "",
        company=payload.target_company or ""
    )

    # Serialize using Pydantic v2 model_dump()
    app_record = Application(
        user_id=current_user.id,
        job_title=result.job_analysis.job_title,
        company_name=result.job_analysis.company_name,
        job_description_raw=payload.job_description_text,
        extracted_keywords=result.job_analysis.model_dump(),
        ats_match_score=result.ats_score.overall_match_score,
        tailored_resume=result.tailored_resume.model_dump(),
        cover_letter=result.cover_letter,
        status="Generated"
    )
    db.add(app_record)
    await db.commit()
    await db.refresh(app_record)

    result.application_id = str(app_record.id)
    return result
