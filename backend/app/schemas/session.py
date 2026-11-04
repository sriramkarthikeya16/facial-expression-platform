"""
MoodLens Backend - Session and Expression Pydantic Schemas
"""
from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List, Literal

VALID_EXPRESSIONS = (
    "happy", "sad", "angry", "fear", "disgust", "surprise",
    "neutral", "occluded", "no_face", "multi_face_warning",
)


class CreateSessionRequest(BaseModel):
    """Request to create a new detection session."""
    model_config = ConfigDict(protected_namespaces=())

    device_id: Optional[str] = None
    platform: str = "web"
    model_version: Optional[str] = None

    @field_validator("platform")
    @classmethod
    def validate_platform(cls, v: str) -> str:
        allowed = ("web", "android", "ios", "desktop", "api", "desktop_windows", "desktop_macos", "desktop_linux")
        if v not in allowed:
            raise ValueError(f"Platform must be one of: {', '.join(allowed)}")
        return v


class SessionResponse(BaseModel):
    """Session creation response."""
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: str
    user_id: str
    device_id: Optional[str]
    platform: str
    model_version: Optional[str]
    started_at: datetime
    ended_at: Optional[datetime]
    total_duration_seconds: Optional[int]
    status: str

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def convert_uuid(cls, v):
        return str(v)


class SessionStateResponse(BaseModel):
    """Real-time state response for an active session."""
    session_id: str
    user_id: str
    expression: str
    tracking_state: str
    confidence: float
    duration_seconds: float
    tracking: bool
    quality: float
    status: str
    timestamp: datetime


class EndSessionRequest(BaseModel):
    """Request to end a session."""
    total_duration_seconds: Optional[int] = None


class ExpressionEventCreate(BaseModel):
    """A single aggregated expression window to be stored."""
    model_config = ConfigDict(protected_namespaces=())

    expression: str
    confidence: float
    duration_seconds: float
    quality_score: Optional[float] = None
    tracking_confidence: Optional[float] = None
    model_version: Optional[str] = None
    recorded_at: Optional[datetime] = None

    @field_validator("expression")
    @classmethod
    def validate_expression(cls, v: str) -> str:
        if v not in VALID_EXPRESSIONS:
            raise ValueError(f"Expression must be one of: {', '.join(VALID_EXPRESSIONS)}")
        return v

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("Confidence must be between 0.0 and 1.0")
        return v

    @field_validator("duration_seconds")
    @classmethod
    def validate_duration(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Duration cannot be negative")
        return v


class BatchExpressionEventsRequest(BaseModel):
    """Batch of expression events from a session."""
    events: List[ExpressionEventCreate]

    @field_validator("events")
    @classmethod
    def validate_events(cls, v: List[ExpressionEventCreate]) -> List[ExpressionEventCreate]:
        if len(v) == 0:
            raise ValueError("Events list cannot be empty")
        if len(v) > 100:
            raise ValueError("Maximum 100 events per batch")
        return v


class ExpressionEventResponse(BaseModel):
    """Response for a stored expression event."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    expression: str
    confidence: float
    duration_seconds: float
    quality_score: Optional[float]
    recorded_at: datetime

    @field_validator("id", "session_id", mode="before")
    @classmethod
    def convert_uuid(cls, v):
        return str(v)


class PaginatedSessionsResponse(BaseModel):
    """Paginated list of sessions."""
    items: List[SessionResponse]
    total: int
    page: int
    pages: int
    limit: int
