"""
MoodLens Backend - Session, ExpressionEvent SQLAlchemy Models
"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Float, Integer, ForeignKey, DateTime, Uuid, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

EXPRESSION_TYPES = (
    "happy", "sad", "angry", "fear", "disgust", "surprise", "neutral",
    "occluded", "no_face",
)

SESSION_STATUSES = ("active", "completed", "abandoned")


class DetectionSession(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    device_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    platform: Mapped[str] = mapped_column(String(20), nullable=False, default="web")
    model_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    total_duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="sessions")  # type: ignore[name-defined]
    expression_events: Mapped[List[ExpressionEvent]] = relationship(
        "ExpressionEvent", back_populates="session", cascade="all, delete-orphan"
    )
    suggestions: Mapped[List[Suggestion]] = relationship(
        "Suggestion", back_populates="session", cascade="all, delete-orphan"
    )
    action_events: Mapped[List[ActionEvent]] = relationship(
        "ActionEvent", back_populates="session"
    )


class ExpressionEvent(Base):
    __tablename__ = "expression_events"

    __table_args__ = (
        Index("ix_expression_events_session_recorded", "session_id", "recorded_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    expression: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    tracking_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    model_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )

    # Relationships
    session: Mapped[DetectionSession] = relationship(
        "DetectionSession", back_populates="expression_events"
    )
