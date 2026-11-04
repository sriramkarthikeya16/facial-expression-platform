"""
MoodLens Backend - Consent SQLAlchemy Model
"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, Uuid, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

CONSENT_TYPES = (
    "camera_access",
    "expression_processing",
    "mood_suggestions",
    "music_integration",
    "food_suggestions",
    "trusted_contacts",
    "cloud_sync",
)


class Consent(Base):
    __tablename__ = "consents"
    __table_args__ = (
        UniqueConstraint("user_id", "consent_type", name="uq_consents_user_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    consent_type: Mapped[str] = mapped_column(String(50), nullable=False)
    granted: Mapped[bool] = mapped_column(Boolean, nullable=False)
    granted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    version: Mapped[str] = mapped_column(String(10), nullable=False, default="1.0")
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped[User] = relationship("User", back_populates="consents")  # type: ignore[name-defined]
