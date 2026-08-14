from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = 'TailorCraft AI'
    API_V1_STR: str = '/api/v1'

    # PostgreSQL async connection (asyncpg driver)
    DATABASE_URL: str = 'postgresql+asyncpg://postgres:postgres@localhost:5432/tailorcraft_db'

    # Cloud Object Storage (S3/R2)
    S3_BUCKET_NAME: str = 'tailorcraft-artifacts'
    S3_ENDPOINT_URL: str = ''
    AWS_ACCESS_KEY_ID: str = ''
    AWS_SECRET_ACCESS_KEY: str = ''

    class Config:
        env_file = '.env'
        extra = 'ignore'


settings = Settings()