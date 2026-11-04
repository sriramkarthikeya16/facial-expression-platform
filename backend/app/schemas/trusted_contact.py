"""
MoodLens Backend - Trusted Contact Schemas
"""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class TrustedContactBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Contact display name")
    phone_number: str = Field(..., min_length=3, max_length=50, description="Phone number for SMS or voice calls")
    relationship: Optional[str] = Field(default=None, max_length=50, description="Relationship e.g. Family, Friend, Therapist")
    is_favorite: bool = Field(default=False, description="Whether this contact is the primary emergency contact")


class TrustedContactCreate(TrustedContactBase):
    pass


class TrustedContactUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    phone_number: Optional[str] = Field(default=None, min_length=3, max_length=50)
    relationship: Optional[str] = Field(default=None, max_length=50)
    is_favorite: Optional[bool] = None


class TrustedContactResponse(TrustedContactBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
