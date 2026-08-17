from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    headline: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class UserOut(UserBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
