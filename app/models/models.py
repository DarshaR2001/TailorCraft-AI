import uuid
from datetime import date, datetime

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
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    headline = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    location = Column(String(100), nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    github_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

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
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

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
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    application = relationship('Application', back_populates='artifacts')
