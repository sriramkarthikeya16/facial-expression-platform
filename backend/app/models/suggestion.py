"""
MoodLens Backend - Suggestion, SuggestionResponse, ActionEvent, AuditLog Models
"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import String, Float, Boolean, ForeignKey, DateTime, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

SUGGESTION_CATEGORIES = ("music", "wellness", "food", "sos")
SUGGESTION_STATUSES = ("pending", "accepted", "dismissed", "expired", "ignored", "disabled")
SUGGESTION_DECISIONS = ("accepted", "dismissed", "expired", "ignored", "disabled")
ACTION_TYPES = (
    "open_music", "open_food_app", "open_emergency_resource",
    "initiate_call", "send_message",
)


class Suggestion(Base):
    __tablename__ = "suggestions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    rule_id: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    expression_trigger: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    confidence_at_trigger: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    requires_confirmation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )

    # Relationships
    session: Mapped[DetectionSession] = relationship("DetectionSession", back_populates="suggestions")  # type: ignore[name-defined]
    user: Mapped[User] = relationship("User", back_populates="suggestions")  # type: ignore[name-defined]
    response: Mapped[Optional[SuggestionResponse]] = relationship(
        "SuggestionResponse", back_populates="suggestion", uselist=False,
        cascade="all, delete-orphan"
    )


class SuggestionResponse(Base):
    __tablename__ = "suggestion_responses"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    suggestion_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("suggestions.id", ondelete="CASCADE"),
        unique=True, nullable=False
    )
    decision: Mapped[str] = mapped_column(String(20), nullable=False)
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    action_executed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    suggestion: Mapped[Suggestion] = relationship("Suggestion", back_populates="response")


class ActionEvent(Base):
    __tablename__ = "action_events"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("sessions.id", ondelete="SET NULL"),
        nullable=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    requires_confirmation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    user_confirmed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    result: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped[User] = relationship("User", back_populates="action_events")  # type: ignore[name-defined]
    session: Mapped[Optional[DetectionSession]] = relationship("DetectionSession", back_populates="action_events")  # type: ignore[name-defined]


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    action_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    model_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    result: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
