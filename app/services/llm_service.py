import json
import re
from openai import AsyncOpenAI
from fastapi import HTTPException, status
from app.core.config import settings
from app.schemas.ai import JobAnalysisResponse, ATSScoreResponse, TailoredApplicationResponse

class LLMService:
    def __init__(self):
        if not settings.DEEPSEEK_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="DEEPSEEK_API_KEY is not configured in .env"
            )
        self.client = AsyncOpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
            default_headers={
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "TailorCraft AI"
            }
        )
        self.model = settings.DEEPSEEK_MODEL

    @staticmethod
    def _clean_json_text(raw_text: str) -> str:
        cleaned = raw_text.strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)
        return cleaned.strip()

    async def analyze_job_description(self, jd_text: str) -> JobAnalysisResponse:
        system_prompt = (
            "You are an expert technical recruiter and ATS specialist. "
            "Analyze the job description and respond ONLY with a JSON object matching this exact schema: "
            "{\n"
            '  "job_title": "string",\n'
            '  "company_name": "string",\n'
            '  "hard_skills": ["skill1", "skill2"],\n'
            '  "soft_skills": ["skill1", "skill2"],\n'
            '  "key_responsibilities": ["resp1", "resp2"],\n'
            '  "qualifications": ["qual1", "qual2"]\n'
            "}"
        )
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Job Description:\n{jd_text}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            raw_content = response.choices[0].message.content
            data = json.loads(self._clean_json_text(raw_content))
            return JobAnalysisResponse(**data)
        except Exception as e:
            print(f"DEBUG - analyze_job_description error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OpenRouter / DeepSeek API Error: {str(e)}"
            )

    async def calculate_ats_match(self, resume_text: str, jd_text: str) -> ATSScoreResponse:
        system_prompt = (
            "You are an ATS (Applicant Tracking System) matching engine. "
            "Evaluate matched keywords vs missing keywords and produce an overall ATS match score between 0 and 100. "
            "Respond ONLY with a JSON object matching this schema: "
            "{\n"
            '  "overall_match_score": 75,\n'
            '  "matched_skills": ["skill1", "skill2"],\n'
            '  "missing_skills": ["skill3", "skill4"],\n'
            '  "improvement_recommendations": ["tip1", "tip2"]\n'
            "}"
        )
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Resume:\n{resume_text}\n\nJob Description:\n{jd_text}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            raw_content = response.choices[0].message.content
            data = json.loads(self._clean_json_text(raw_content))
            return ATSScoreResponse(**data)
        except Exception as e:
            print(f"DEBUG - calculate_ats_match error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OpenRouter ATS Scoring Error: {str(e)}"
            )

    async def tailor_application(
        self, 
        resume_text: str, 
        jd_text: str, 
        job_title: str = "", 
        company: str = ""
    ) -> TailoredApplicationResponse:
        system_prompt = f"""
        You are an elite career strategist and resume tailoring engine.
        
        CRITICAL ANTI-HALLUCINATION GUARDRAILS:
        1. STRICT FACTUAL ACCURACY: Never invent new job titles, employers, degrees, or certifications not explicitly present in the original resume.
        2. EXPERIENCE REWRITING: Enhance work experience bullet points by incorporating relevant keywords from the job description using the XYZ formula (Accomplished [X] as measured by [Y], by doing [Z]). Use strong active verbs.
        3. TAILORED SUMMARY: Craft a compelling 3-4 sentence professional summary targeted for {job_title or 'the target role'} at {company or 'the target company'}.
        4. COVER LETTER: Write a 3-4 paragraph personalized cover letter.
        
        Respond ONLY with a valid JSON object matching the TailoredApplicationResponse schema.
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Candidate Resume:\n{resume_text}\n\nTarget JD:\n{jd_text}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )
            raw_content = response.choices[0].message.content
            data = json.loads(self._clean_json_text(raw_content))
            return TailoredApplicationResponse(**data)
        except Exception as e:
            print(f"DEBUG - tailor_application error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI Tailoring Pipeline error: {str(e)}"
            )
