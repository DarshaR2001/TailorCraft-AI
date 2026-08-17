import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.models import User, Application, DocumentArtifact
from app.api.v1.endpoints.auth import get_current_user
from app.schemas.resume import StructuredResume, ContactInfo, Skills
from app.services.document_service import DocumentGenerationService
from app.services.storage_service import StorageService

router = APIRouter(prefix="/export", tags=["Document Export Engine"])
storage = StorageService()


# -----------------------------------------------------------------------------
# Response Schemas
# -----------------------------------------------------------------------------
class ArtifactOut(BaseModel):
    artifact_id: uuid.UUID
    document_type: str
    file_name: str
    file_size_bytes: Optional[int]
    download_url: Optional[str]

    class Config:
        from_attributes = True


class GenerateDocumentsResponse(BaseModel):
    application_id: uuid.UUID
    job_title: str
    company_name: str
    artifacts: List[ArtifactOut]


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------
@router.post("/{application_id}/generate-documents", response_model=GenerateDocumentsResponse)
async def generate_application_documents(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates ATS-optimized PDF and DOCX documents for both the tailored CV and Cover Letter,
    persists them to storage, and registers records in document_artifacts.
    """
    # 1. Fetch Application belonging to Current User
    result = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.user_id == current_user.id
        )
    )
    application = result.scalars().first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found or unauthorized access."
        )

    # 2. Extract Structured Resume from Application record (or fallback to user profile)
    user_contact = ContactInfo(
        full_name=current_user.full_name,
        email=current_user.email,
        phone=current_user.phone,
        location=current_user.location,
        linkedin_url=current_user.linkedin_url,
        github_url=current_user.github_url
    )

    resume_obj = StructuredResume(
        contact_info=user_contact,
        professional_summary=f"Dedicated {application.job_title} candidate with proven technical expertise tailored for {application.company_name}.",
        skills=Skills(
            technical_skills=application.extracted_keywords.get("matched_skills", []) if application.extracted_keywords else [],
            tools_and_frameworks=[],
            soft_skills=[]
        )
    )

    cover_letter_content = (
        f"Dear Hiring Team at {application.company_name},\n\n"
        f"I am writing to express my strong interest in the {application.job_title} position. "
        f"With a dedicated background aligned to your target requirements, I am confident in delivering immediate value.\n\n"
        f"Thank you for considering my application. I look forward to discussing how my experience will benefit {application.company_name}.\n\n"
        f"Sincerely,\n{current_user.full_name}"
    )

    candidate_contact_line = " | ".join(
        filter(None, [str(current_user.email), current_user.phone, current_user.location])
    )

    # 3. Generate In-Memory Binary Buffers
    cv_pdf_buf = DocumentGenerationService.generate_resume_pdf(resume_obj)
    cv_docx_buf = DocumentGenerationService.generate_resume_docx(resume_obj)
    cl_pdf_buf = DocumentGenerationService.generate_cover_letter_pdf(
        candidate_name=current_user.full_name,
        contact_info_line=candidate_contact_line,
        company_name=application.company_name,
        content=cover_letter_content
    )
    cl_docx_buf = DocumentGenerationService.generate_cover_letter_docx(
        candidate_name=current_user.full_name,
        contact_info_line=candidate_contact_line,
        company_name=application.company_name,
        content=cover_letter_content
    )

    # 4. Save Artifacts to Storage and Database
    job_tag = application.job_title
    comp_tag = application.company_name

    artifacts_meta = [
        ("CV_PDF", f"{current_user.full_name.replace(' ', '_')}_Resume.pdf", cv_pdf_buf, "application/pdf"),
        ("CV_DOCX", f"{current_user.full_name.replace(' ', '_')}_Resume.docx", cv_docx_buf, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        ("COVER_LETTER_PDF", f"{current_user.full_name.replace(' ', '_')}_Cover_Letter.pdf", cl_pdf_buf, "application/pdf"),
        ("COVER_LETTER_DOCX", f"{current_user.full_name.replace(' ', '_')}_Cover_Letter.docx", cl_docx_buf, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ]

    saved_artifacts = []
    for doc_type, fname, buf, mime in artifacts_meta:
        artifact = await storage.save_artifact(
            db=db,
            application_id=application.id,
            user_id=current_user.id,
            document_type=doc_type,
            filename=fname,
            file_buffer=buf,
            content_type=mime,
            job_title=job_tag,
            company_name=comp_tag
        )
        download_url = storage.generate_presigned_download_url(artifact.storage_path)
        saved_artifacts.append(
            ArtifactOut(
                artifact_id=artifact.id,
                document_type=artifact.document_type,
                file_name=artifact.file_name,
                file_size_bytes=artifact.file_size_bytes,
                download_url=download_url
            )
        )

    return GenerateDocumentsResponse(
        application_id=application.id,
        job_title=application.job_title,
        company_name=application.company_name,
        artifacts=saved_artifacts
    )


@router.get("/artifacts/{artifact_id}/download")
async def get_artifact_download_url(
    artifact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns a temporary presigned URL to download the artifact."""
    result = await db.execute(
        select(DocumentArtifact)
        .join(Application, DocumentArtifact.application_id == Application.id)
        .where(
            DocumentArtifact.id == artifact_id,
            Application.user_id == current_user.id
        )
    )
    artifact = result.scalars().first()
    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artifact not found or unauthorized access."
        )

    download_url = storage.generate_presigned_download_url(artifact.storage_path)
    return {
        "artifact_id": artifact.id,
        "document_type": artifact.document_type,
        "file_name": artifact.file_name,
        "download_url": download_url
    }


@router.get("/download/local")
async def download_local_file(path: str):
    """Direct file download endpoint for local development storage fallback."""
    local_path = os.path.join(os.getcwd(), "storage", path.replace("/", os.sep))
    if not os.path.exists(local_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on server.")
    return FileResponse(
        path=local_path,
        filename=os.path.basename(local_path),
        media_type="application/octet-stream"
    )
