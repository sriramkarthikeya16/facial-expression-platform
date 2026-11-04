"""
MoodLens Backend - Authentication Pydantic Schemas
"""
import re
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from datetime import datetime


class RegisterRequest(BaseModel):
    """Request body for user registration."""
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(v) > 50:
            raise ValueError("Username must be at most 50 characters")
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Username may only contain letters, digits, underscores, and hyphens")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class LoginRequest(BaseModel):
    """Request body for user login."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response containing the JWT access token."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class UserResponse(BaseModel):
    """Public user data returned after registration or login."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    username: str
    role: str
    is_verified: bool
    created_at: datetime

    @field_validator("id", mode="before")
    @classmethod
    def convert_uuid(cls, v):
        return str(v)
