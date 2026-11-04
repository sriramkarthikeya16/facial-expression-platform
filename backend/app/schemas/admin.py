"""
MoodLens Backend - Admin Observability & Telemetry Pydantic Schemas
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from app.schemas.model_registry import ModelResponse


class EmotionFrequencyItem(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    name: str
    count: int
    percentage: float
    color: str


class AdminTelemetryResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    total_users: int
    total_sessions: int
    active_sessions: int
    completed_sessions: int
    total_events: int

    avg_confidence: float
    low_confidence_rate: float

    latency_p50_ms: float
    latency_p95_ms: float
    latency_p99_ms: float

    suggestion_ctr: float
    total_suggestions: int
    accepted_suggestions: int
    dismissed_suggestions: int
    expired_suggestions: int

    emotion_frequencies: List[EmotionFrequencyItem]
    active_model: Optional[ModelResponse] = None
    models: List[ModelResponse] = []

    zero_biometric_storage_verified: bool = True
    gdpr_audit_compliant: bool = True
