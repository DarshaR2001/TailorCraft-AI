import json
import re
from openai import AsyncOpenAI
from fastapi import HTTPException, status
from app.core.config import settings
from app.schemas.ai import JobAnalysisResponse, ATSScoreResponse, TailoredApplicationResponse

# Best available free model for structured JSON on OpenRouter
# Updated after testing: nvidia ultra-550B produces highest quality resume output
FREE_MODEL_FALLBACK = "nvidia/nemotron-3-ultra-550b-a55b:free"

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
            timeout=120.0,  # 2-minute timeout for large tailoring prompts
        )
        # Auto-upgrade weak/retired models to a capable free model
        configured = settings.DEEPSEEK_MODEL
        weak_or_retired = {
            "liquid/lfm-2.5-2.6b:free",
            "liquid/lfm-2.5:free",
            "google/gemini-2.0-flash-exp:free",  # retired from OpenRouter
        }
        self.model = FREE_MODEL_FALLBACK if configured in weak_or_retired else configured
        print(f"[LLMService] Using model: {self.model}")

    @staticmethod
    def _clean_json_text(raw_text: str) -> str:
        """Strip markdown fences and extract the first JSON object/array found."""
        cleaned = raw_text.strip()
        # Remove ```json ... ``` fences
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)
        cleaned = cleaned.strip()
        # If the result still has surrounding text, extract the first {...} block
        if not cleaned.startswith("{") and not cleaned.startswith("["):
            match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
            if match:
                cleaned = match.group(1)
        return cleaned

    @staticmethod
    def _normalize_resume_data(data: dict) -> dict:
        """Ensures the tailored_resume payload complies strictly with Pydantic structure."""
        if not isinstance(data, dict):
            return {}

        # 1. Normalize job_analysis
        ja = data.get("job_analysis", {})
        if not isinstance(ja, dict):
            ja = {}
        data["job_analysis"] = {
            "job_title": str(ja.get("job_title") or "Target Role"),
            "company_name": str(ja.get("company_name") or "Target Company"),
            "hard_skills": ja.get("hard_skills") if isinstance(ja.get("hard_skills"), list) else [],
            "soft_skills": ja.get("soft_skills") if isinstance(ja.get("soft_skills"), list) else [],
            "key_responsibilities": ja.get("key_responsibilities") if isinstance(ja.get("key_responsibilities"), list) else [],
            "qualifications": ja.get("qualifications") if isinstance(ja.get("qualifications"), list) else [],
        }

        # 2. Normalize ats_score
        ats = data.get("ats_score", {})
        if not isinstance(ats, dict):
            ats = {}
        score_val = ats.get("overall_match_score", 80)
        try:
            score_val = int(score_val)
        except (ValueError, TypeError):
            score_val = 80
        score_val = max(0, min(100, score_val))
        data["ats_score"] = {
            "overall_match_score": score_val,
            "matched_skills": ats.get("matched_skills") if isinstance(ats.get("matched_skills"), list) else [],
            "missing_skills": ats.get("missing_skills") if isinstance(ats.get("missing_skills"), list) else [],
            "improvement_recommendations": ats.get("improvement_recommendations") if isinstance(ats.get("improvement_recommendations"), list) else [],
        }

        # 3. Normalize tailored_resume
        if "tailored_resume" in data and isinstance(data["tailored_resume"], dict):
            resume = data["tailored_resume"]

            # Contact info
            ci = resume.get("contact_info", {})
            if not isinstance(ci, dict):
                ci = {}
            email_val = ci.get("email")
            if email_val and ("or null" in str(email_val).lower() or str(email_val).strip() in ("null", "None", "N/A")):
                email_val = None
            resume["contact_info"] = {
                "full_name": str(ci.get("full_name") or "Candidate"),
                "email": str(email_val).strip() if email_val else None,
                "phone": str(ci.get("phone")).strip() if ci.get("phone") else None,
                "location": str(ci.get("location")).strip() if ci.get("location") else None,
                "linkedin_url": str(ci.get("linkedin_url")).strip() if ci.get("linkedin_url") else None,
                "github_url": str(ci.get("github_url")).strip() if ci.get("github_url") else None,
                "portfolio_url": str(ci.get("portfolio_url")).strip() if ci.get("portfolio_url") else None,
            }

            # Work Experience
            we_list = resume.get("work_experience", [])
            normalized_we = []
            if isinstance(we_list, list):
                for exp in we_list:
                    if isinstance(exp, dict):
                        normalized_we.append({
                            "company_name": str(exp.get("company_name") or "Organization"),
                            "job_title": str(exp.get("job_title") or "Role"),
                            "location": str(exp.get("location")) if exp.get("location") else None,
                            "start_date": str(exp.get("start_date")) if exp.get("start_date") else None,
                            "end_date": str(exp.get("end_date")) if exp.get("end_date") else None,
                            "is_current": bool(exp.get("is_current", False)),
                            "bullet_points": [str(b) for b in exp.get("bullet_points", []) if b],
                        })
            resume["work_experience"] = normalized_we

            # Education
            edu_list = resume.get("education", [])
            normalized_edu = []
            if isinstance(edu_list, list):
                for edu in edu_list:
                    if isinstance(edu, dict):
                        normalized_edu.append({
                            "institution": str(edu.get("institution") or "University"),
                            "degree": str(edu.get("degree") or "Degree"),
                            "field_of_study": str(edu.get("field_of_study")) if edu.get("field_of_study") else None,
                            "graduation_year": str(edu.get("graduation_year")) if edu.get("graduation_year") else None,
                            "gpa_or_grade": str(edu.get("gpa_or_grade")) if edu.get("gpa_or_grade") else None,
                        })
            resume["education"] = normalized_edu

            # Certifications
            cert_list = resume.get("certifications", [])
            normalized_cert = []
            if isinstance(cert_list, list):
                for cert in cert_list:
                    if isinstance(cert, dict) and cert.get("name"):
                        normalized_cert.append({
                            "name": str(cert.get("name")),
                            "issuing_organization": str(cert.get("issuing_organization")) if cert.get("issuing_organization") else None,
                            "issue_date": str(cert.get("issue_date")) if cert.get("issue_date") else None,
                            "credential_id": str(cert.get("credential_id")) if cert.get("credential_id") else None,
                        })
            resume["certifications"] = normalized_cert

            # Skills
            sk = resume.get("skills", {})
            if isinstance(sk, dict):
                resume["skills"] = {
                    "technical_skills": [str(s) for s in sk.get("technical_skills", []) if s],
                    "soft_skills": [str(s) for s in sk.get("soft_skills", []) if s],
                    "tools_and_frameworks": [str(s) for s in sk.get("tools_and_frameworks", []) if s],
                }
            elif isinstance(sk, list):
                resume["skills"] = {
                    "technical_skills": [str(s) for s in sk if s],
                    "soft_skills": [],
                    "tools_and_frameworks": [],
                }
            else:
                resume["skills"] = {
                    "technical_skills": [],
                    "soft_skills": [],
                    "tools_and_frameworks": [],
                }
        else:
            data["tailored_resume"] = {
                "contact_info": {"full_name": "Candidate"},
                "professional_summary": None,
                "work_experience": [],
                "education": [],
                "certifications": [],
                "skills": {"technical_skills": [], "soft_skills": [], "tools_and_frameworks": []},
            }

        # 4. Normalize cover_letter
        data["cover_letter"] = str(data.get("cover_letter") or "Dear Hiring Manager,\n\nPlease find my resume attached.\n\nSincerely,\nCandidate")

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
            "full_name": "Candidate Full Name from resume",
            "email": null,
            "phone": null,
            "location": null,
            "linkedin_url": null,
            "github_url": null,
            "portfolio_url": null
        }},
        "professional_summary": "3-4 sentence tailored summary here",
        "work_experience": [
            {{
                "company_name": "Employer name from resume",
                "job_title": "Exact job title from resume",
                "location": null,
                "start_date": "2022",
                "end_date": null,
                "is_current": false,
                "bullet_points": ["Accomplished X as measured by Y by doing Z"]
            }}
        ],
        "education": [
            {{
                "institution": "University name from resume",
                "degree": "Degree name",
                "field_of_study": null,
                "graduation_year": null,
                "gpa_or_grade": null
            }}
        ],
        "certifications": [],
        "skills": {{
            "technical_skills": ["skill1", "skill2"],
            "soft_skills": ["skill1"],
            "tools_and_frameworks": ["tool1"]
        }}
    }},
    "cover_letter": "Dear Hiring Manager,\\n\\nOpening paragraph.\\n\\nSkills paragraph.\\n\\nClosing paragraph.\\n\\nSincerely,\\nCandidate Name"
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
            print(f"DEBUG - tailor raw response (first 300 chars): {raw_content[:300]}")
            data = json.loads(self._clean_json_text(raw_content))
            data = self._normalize_resume_data(data)
            return TailoredApplicationResponse(**data)
        except json.JSONDecodeError as e:
            print(f"DEBUG - JSON parse error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"The AI returned malformed JSON. Please try again. (Parse error: {str(e)})"
            )
        except Exception as e:
            err_str = str(e)
            print(f"DEBUG - tailor_application error ({type(e).__name__}): {err_str}")
            # Surface Pydantic validation errors clearly
            if "validation error" in err_str.lower():
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"AI response had unexpected structure. Please try again. (Detail: {err_str[:300]})"
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI Tailoring failed: {err_str[:300]}"
            )
