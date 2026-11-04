"""
MoodLens Backend - User SQLAlchemy Model
"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Boolean, DateTime, Uuid, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(320),
        unique=True,
        nullable=False,
        index=True,
    )
    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="user",
        index=True,
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    refresh_tokens: Mapped[List[RefreshToken]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )
    preferences: Mapped[Optional[UserPreferences]] = relationship(
        "UserPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    consents: Mapped[List[Consent]] = relationship(
        "Consent", back_populates="user", cascade="all, delete-orphan"
    )
    sessions: Mapped[List[DetectionSession]] = relationship(
        "DetectionSession", back_populates="user", cascade="all, delete-orphan"
    )
    suggestions: Mapped[List[Suggestion]] = relationship(
        "Suggestion", back_populates="user", cascade="all, delete-orphan"
    )
    integrations: Mapped[List[Integration]] = relationship(
        "Integration", back_populates="user", cascade="all, delete-orphan"
    )
    trusted_contacts: Mapped[List[TrustedContact]] = relationship(
        "TrustedContact", back_populates="user", cascade="all, delete-orphan"
    )
    action_events: Mapped[List[ActionEvent]] = relationship(
        "ActionEvent", back_populates="user", cascade="all, delete-orphan"
    )
    devices: Mapped[List[Device]] = relationship(
        "Device", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    device_fingerprint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="refresh_tokens")


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    theme: Mapped[str] = mapped_column(String(10), nullable=False, default="system")
    notification_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    quiet_hours_start: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)  # "HH:MM"
    quiet_hours_end: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    suggestion_frequency: Mapped[str] = mapped_column(
        String(20), nullable=False, default="normal"
    )
    music_genres: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    preferred_playlists: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    preferred_food_apps: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship("User", back_populates="preferences")
