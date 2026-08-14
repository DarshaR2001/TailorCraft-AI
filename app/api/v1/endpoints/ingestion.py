from fastapi import APIRouter, UploadFile, File, HTTPException, status
from pydantic import BaseModel, HttpUrl
from typing import Optional
import requests
from bs4 import BeautifulSoup
from app.services.parser_service import DocumentParsingService

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

MAX_FILE_SIZE = 15 * 1024 * 1024
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
}

# --- Schemas ---

class ParseCVResponse(BaseModel):
    filename: str
    content_type: str
    file_size_bytes: int
    raw_text: str

class JobDescriptionRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[HttpUrl] = None

class JobDescriptionResponse(BaseModel):
    source_type: str
    raw_text: str

# --- Endpoints ---

@router.post("/cv", response_model=ParseCVResponse)
async def upload_and_parse_cv(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{file.content_type}'. Must be PDF, DOCX, or TXT."
        )
    file_bytes = await file.read()
    file_size = len(file_bytes)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds maximum allowed size of 15MB."
        )
    try:
        raw_text = DocumentParsingService.extract_text(file.filename, file_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse document: {str(e)}"
        )
    return ParseCVResponse(
        filename=file.filename,
        content_type=file.content_type,
        file_size_bytes=file_size,
        raw_text=raw_text
    )

@router.post("/job-description", response_model=JobDescriptionResponse)
async def ingest_job_description(payload: JobDescriptionRequest):
    """
    Ingests a job description either via direct raw text / markdown or by scraping a target URL.
    """
    if not payload.text and not payload.url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Must provide either 'text' or 'url'."
        )
    
    # 1. Handle Direct Text Ingestion
    if payload.text:
        return JobDescriptionResponse(source_type="text", raw_text=payload.text.strip())
    
    # 2. Handle URL Scraping Ingestion
    if payload.url:
        try:
            # Mask as a standard browser to prevent 403 Forbidden blocks from job boards
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"}
            response = requests.get(str(payload.url), headers=headers, timeout=10)
            response.raise_for_status()
            
            # Parse HTML and extract visible text
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Remove script and style elements from the parsed tree
            for script_or_style in soup(["script", "style", "header", "footer", "nav"]):
                script_or_style.extract()
                
            text_content = " \n".join(soup.stripped_strings)
            
            return JobDescriptionResponse(source_type="url", raw_text=text_content)
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Failed to scrape Job Description URL: {str(e)}"
            )