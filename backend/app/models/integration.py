"""
MoodLens Backend - Integration, TrustedContact, ModelVersion, Device Models
"""
from __future__ import annotations
import uuid
from datetime import datetime, date
from typing import Optional, List

from sqlalchemy import String, Boolean, Float, ForeignKey, DateTime, Date, Text, Uuid, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship as orm_relationship

from app.db.base import Base

INTEGRATION_PROVIDERS = ("spotify", "google", "apple_music")


class Integration(Base):
    __tablename__ = "integrations"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_integrations_user_provider"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(30), nullable=False)
    access_token_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    refresh_token_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    scope: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = orm_relationship("User", back_populates="integrations")  # type: ignore[name-defined]


class TrustedContact(Base):
    __tablename__ = "trusted_contacts"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(50), nullable=False)
    relationship: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = orm_relationship("User", back_populates="trusted_contacts")  # type: ignore[name-defined]

    @property
    def display_name(self) -> str:
        return self.name

    @property
    def is_primary(self) -> bool:
        return self.is_favorite


class ModelVersion(Base):
    __tablename__ = "model_versions"
    __table_args__ = (
        UniqueConstraint("model_name", "version", name="uq_model_versions_name_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    model_name: Mapped[str] = mapped_column(String(50), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    architecture: Mapped[str] = mapped_column(String(50), nullable=False)
    accuracy_overall: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    macro_f1: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    balanced_accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    file_hash_sha256: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    quantization: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    supported_platforms: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    release_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    device_fingerprint: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False
    )
    platform: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    os_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    app_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    last_seen: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped[User] = orm_relationship("User", back_populates="devices")  # type: ignore[name-defined]
