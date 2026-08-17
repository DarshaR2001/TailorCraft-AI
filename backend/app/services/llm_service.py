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
            base_url=settings.DEEPSEEK_BASE_URL
        )
        self.model = settings.DEEPSEEK_MODEL

    @staticmethod
    def _clean_json_text(raw_text: str) -> str:
        cleaned = raw_text.strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)
        return cleaned.strip()

    @staticmethod
    def _normalize_resume_data(data: dict) -> dict:
        """Ensures the tailored_resume payload complies strictly with Pydantic structure."""
        if "tailored_resume" in data and isinstance(data["tailored_resume"], dict):
            resume = data["tailored_resume"]
            # Handle missing or malformed skills field
            if "skills" not in resume or not isinstance(resume["skills"], dict):
                raw_skills = resume.get("skills", [])
                if isinstance(raw_skills, list):
                    resume["skills"] = {
                        "technical_skills": raw_skills,
                        "soft_skills": [],
                        "tools_and_frameworks": []
                    }
                else:
                    resume["skills"] = {
                        "technical_skills": [],
                        "soft_skills": [],
                        "tools_and_frameworks": []
                    }
        return data

    async def analyze_job_description(self, jd_text: str) -> JobAnalysisResponse:
        system_prompt = (
            "You are an expert technical recruiter and ATS specialist. "
            "Analyze the job description and respond ONLY with a JSON object matching this schema:\n"
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
                detail=f"AI API Error: {str(e)}"
            )

    async def calculate_ats_match(self, resume_text: str, jd_text: str) -> ATSScoreResponse:
        system_prompt = (
            "You are an ATS (Applicant Tracking System) matching engine. "
            "Evaluate matched keywords vs missing keywords and produce an ATS match score between 0 and 100. "
            "Respond ONLY with a JSON object matching this schema:\n"
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
                detail=f"AI ATS Scoring Error: {str(e)}"
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
1. STRICT FACTUAL ACCURACY: You must NEVER invent new job titles, past employers, degrees, or certifications not explicitly present in the original resume.
2. EXPERIENCE REWRITING: Enhance work experience bullet points by incorporating relevant keywords from the job description using the XYZ formula (Accomplished [X] as measured by [Y], by doing [Z]). Use strong active verbs.
3. TAILORED SUMMARY: Craft a compelling 3-4 sentence professional summary targeted specifically for {job_title or 'the target role'} at {company or 'the target company'}.
4. COVER LETTER: Write a 3-4 paragraph personalized cover letter demonstrating how the candidate's verified skills align with the company's needs.

Respond ONLY with a JSON object matching this exact top-level schema (all fields required):
{{
    "job_analysis": {{
        "job_title": "{job_title or 'Target Job Title'}",
        "company_name": "{company or 'Target Company'}",
        "hard_skills": ["skill1", "skill2"],
        "soft_skills": ["skill1", "skill2"],
        "key_responsibilities": ["resp1", "resp2"],
        "qualifications": ["qual1", "qual2"]
    }},
    "ats_score": {{
        "overall_match_score": 85,
        "matched_skills": ["skill1", "skill2"],
        "missing_skills": ["skill3"],
        "improvement_recommendations": ["tip1"]
    }},
    "tailored_resume": {{
        "contact_info": {{
            "full_name": "Full Name",
            "email": "email@example.com",
            "phone": "string or null",
            "location": "string or null",
            "linkedin_url": null,
            "github_url": null,
            "portfolio_url": null
        }},
        "professional_summary": "Summary text...",
        "work_experience": [
            {{
                "company_name": "Company",
                "job_title": "Role",
                "location": "City, State",
                "start_date": "2022",
                "end_date": "Present",
                "is_current": true,
                "bullet_points": ["Accomplished X measured by Y by doing Z"]
            }}
        ],
        "education": [
            {{
                "institution": "University",
                "degree": "B.S. in Computer Science",
                "field_of_study": "Computer Science",
                "graduation_year": "2022",
                "gpa_or_grade": null
            }}
        ],
        "certifications": [],
        "skills": {{
            "technical_skills": ["Python", "FastAPI"],
            "soft_skills": ["Communication"],
            "tools_and_frameworks": ["Git", "Docker"]
        }}
    }},
    "cover_letter": "Dear Hiring Manager,\\n\\nParagraph 1...\\n\\nParagraph 2...\\n\\nParagraph 3...\\n\\nSincerely,\\nCandidate Name"
}}
"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Candidate Resume:\n{resume_text}\n\nTarget Job Description:\n{jd_text}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            raw_content = response.choices[0].message.content
            data = json.loads(self._clean_json_text(raw_content))
            data = self._normalize_resume_data(data)
            return TailoredApplicationResponse(**data)
        except Exception as e:
            print(f"DEBUG - tailor_application error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI Tailoring Pipeline error: {str(e)}"
            )
