from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TailorCraft AI"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/tailorcraft_db"
    
    # AI Engine (OpenRouter)
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://openrouter.ai/api/v1"
    DEEPSEEK_MODEL: str = "google/gemini-2.0-flash-exp:free"
    
    # Security & Storage
    SECRET_KEY: str = "SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION"
    S3_BUCKET_NAME: str = "tailorcraft-artifacts"
    S3_ENDPOINT_URL: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
