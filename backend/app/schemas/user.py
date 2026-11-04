"""
MoodLens Backend - User Pydantic Schemas
"""
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List


class UserResponse(BaseModel):
    """Public user profile data."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    username: str
    role: str
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @field_validator("id", mode="before")
    @classmethod
    def convert_uuid(cls, v):
        return str(v)


class UpdateUserRequest(BaseModel):
    """Partial update for user profile."""
    username: Optional[str] = None
    email: Optional[EmailStr] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if len(v) < 3 or len(v) > 50:
            raise ValueError("Username must be 3-50 characters")
        return v


class DeleteAccountRequest(BaseModel):
    """Requires password confirmation for account deletion."""
    password: str


class UserPreferencesResponse(BaseModel):
    """User preferences response."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    theme: str
    notification_enabled: bool
    quiet_hours_start: Optional[str]
    quiet_hours_end: Optional[str]
    suggestion_frequency: str
    music_genres: Optional[List[str]]
    preferred_playlists: Optional[List[str]]
    preferred_food_apps: Optional[List[str]]

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def convert_uuid(cls, v):
        return str(v)


class UpdatePreferencesRequest(BaseModel):
    """Partial update for user preferences."""
    theme: Optional[str] = None
    notification_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    suggestion_frequency: Optional[str] = None
    music_genres: Optional[List[str]] = None
    preferred_playlists: Optional[List[str]] = None
    preferred_food_apps: Optional[List[str]] = None

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("light", "dark", "system"):
            raise ValueError("Theme must be light, dark, or system")
        return v

    @field_validator("suggestion_frequency")
    @classmethod
    def validate_frequency(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("low", "normal", "high"):
            raise ValueError("Suggestion frequency must be low, normal, or high")
        return v
