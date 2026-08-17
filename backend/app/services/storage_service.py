import io
import os
import uuid
from datetime import datetime
from typing import Optional
import boto3
from botocore.exceptions import ClientError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import DocumentArtifact


class StorageService:
    def __init__(self):
        self.bucket_name = settings.S3_BUCKET_NAME
        self.is_s3_configured = bool(
            settings.AWS_ACCESS_KEY_ID and 
            settings.AWS_SECRET_ACCESS_KEY and 
            settings.S3_BUCKET_NAME
        )
        
        if self.is_s3_configured:
            client_kwargs = {
                "service_name": "s3",
                "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
                "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
            }
            if settings.S3_ENDPOINT_URL:
                client_kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL

            self.s3_client = boto3.client(**client_kwargs)
        else:
            self.s3_client = None
            self.local_storage_dir = os.path.join(os.getcwd(), "storage")
            os.makedirs(self.local_storage_dir, exist_ok=True)

    def _generate_storage_key(
        self, 
        user_id: uuid.UUID, 
        job_title: str, 
        company_name: str, 
        filename: str
    ) -> str:
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
        safe_company = "".join(c for c in company_name if c.isalnum() or c in ("-", "_")).strip()
        safe_title = "".join(c for c in job_title if c.isalnum() or c in ("-", "_")).strip()
        folder_tag = f"{safe_title}_{safe_company}" if (safe_title or safe_company) else "general"
        return f"users/{user_id}/applications/{date_str}/{folder_tag}/{filename}"

    async def save_artifact(
        self,
        db: AsyncSession,
        application_id: uuid.UUID,
        user_id: uuid.UUID,
        document_type: str,
        filename: str,
        file_buffer: io.BytesIO,
        content_type: str,
        job_title: str = "",
        company_name: str = ""
    ) -> DocumentArtifact:
        storage_key = self._generate_storage_key(user_id, job_title, company_name, filename)
        file_bytes = file_buffer.getvalue()
        file_size = len(file_bytes)

        if self.is_s3_configured:
            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=storage_key,
                    Body=file_bytes,
                    ContentType=content_type
                )
            except ClientError as e:
                print(f"S3 Upload failed, writing locally: {str(e)}")
                self._save_local(storage_key, file_bytes)
        else:
            self._save_local(storage_key, file_bytes)

        artifact = DocumentArtifact(
            application_id=application_id,
            document_type=document_type,
            file_name=filename,
            storage_path=storage_key,
            file_size_bytes=file_size
        )
        db.add(artifact)
        await db.commit()
        await db.refresh(artifact)
        return artifact

    def _save_local(self, storage_key: str, data: bytes):
        local_path = os.path.join(self.local_storage_dir, storage_key.replace("/", os.sep))
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(data)

    def generate_presigned_download_url(self, storage_path: str, expiration_seconds: int = 900) -> Optional[str]:
        """Generates a secure 15-minute expiring download URL."""
        if self.is_s3_configured:
            try:
                return self.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket_name, "Key": storage_path},
                    ExpiresIn=expiration_seconds,
                )
            except ClientError as e:
                print(f"Error generating presigned URL: {str(e)}")
                return None
        else:
            return f"/api/v1/export/download/local?path={storage_path}"
