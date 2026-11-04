"""
MoodLens Backend - Model Registry SQLAlchemy Model
"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy import String, Float, Integer, Boolean, DateTime, Uuid, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ModelRegistry(Base):
    __tablename__ = "model_registry"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    model_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    architecture: Mapped[str] = mapped_column(String(50), nullable=False, default="MobileNetV3-Large")
    quantization: Mapped[str] = mapped_column(String(10), nullable=False, default="fp32")
    format: Mapped[str] = mapped_column(String(10), nullable=False, default="onnx")
    file_name: Mapped[str] = mapped_column(String(100), nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    dataset_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v1.0-balanced")
    accuracy: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    macro_f1: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    balanced_accuracy: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    expected_calibration_error: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    metrics_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    benchmarks_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_fallback: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    rollback_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
