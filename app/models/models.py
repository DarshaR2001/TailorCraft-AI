import uuid
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base, relationship, Mapped, mapped_column

Base = declarative_base()


class User(Base):
    __tablename__ = 'users'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    headline: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    github_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    applications = relationship('Application', back_populates='user', cascade='all, delete-orphan')


class Application(Base):
    __tablename__ = 'applications'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    job_title = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=False)
    job_description_raw = Column(Text, nullable=False)
    extracted_keywords = Column(JSONB, nullable=True)
    ats_match_score = Column(Integer, CheckConstraint('ats_match_score BETWEEN 0 AND 100'), nullable=True)
    status = Column(String(50), default='Generated')
    created_at = Column(Date, nullable=False, default=date.today)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='applications')
    artifacts = relationship('DocumentArtifact', back_populates='application', cascade='all, delete-orphan')

    __table_args__ = (
        Index('idx_applications_date_job', 'created_at', 'job_title', 'company_name'),
    )


class DocumentArtifact(Base):
    __tablename__ = 'document_artifacts'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey('applications.id', ondelete='CASCADE'), nullable=False)
    document_type = Column(String(50), nullable=False)  # CV_PDF, CV_DOCX, COVER_LETTER_PDF, COVER_LETTER_DOCX
    file_name = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    application = relationship('Application', back_populates='artifacts')
