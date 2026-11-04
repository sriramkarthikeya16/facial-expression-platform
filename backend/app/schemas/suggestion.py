"""
MoodLens Backend - Suggestion, Consent, and Action Authorization Pydantic Schemas
"""
from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any

VALID_CONSENT_TYPES = (
    "camera",
    "camera_access",
    "expression_processing",
    "mood_suggestions",
    "music_integration",
    "food_suggestions",
    "trusted_contacts",
    "cloud_sync",
)

VALID_DECISIONS = ("accepted", "dismissed", "expired", "ignored", "disabled")
VALID_CATEGORIES = ("music", "wellness", "food", "sos")


# --------------------------------------------------------------------------- #
# Consent Schemas                                                             #
# --------------------------------------------------------------------------- #

class ConsentRequest(BaseModel):
    """Grant or update a consent."""
    consent_type: str
    granted: bool

    @field_validator("consent_type")
    @classmethod
    def validate_consent_type(cls, v: str) -> str:
        if v not in VALID_CONSENT_TYPES:
            raise ValueError(f"consent_type must be one of: {', '.join(VALID_CONSENT_TYPES)}")
        return v


class ConsentResponse(BaseModel):
    """Consent record response."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    consent_type: str
    granted: bool
    granted_at: Optional[datetime]
    revoked_at: Optional[datetime]
    version: str
    created_at: datetime

    @field_validator("id", "user_id", mode="before")
    @classmethod
    def convert_uuid(cls, v):
        return str(v)


class AllConsentsResponse(BaseModel):
    """All consents for the current user."""
    consents: List[ConsentResponse]


# --------------------------------------------------------------------------- #
# Suggestion Schemas                                                          #
# --------------------------------------------------------------------------- #

class SuggestionResponse(BaseModel):
    """A suggestion delivered to the user."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    category: str
    rule_id: str
    expression_trigger: Optional[str]
    confidence_at_trigger: Optional[float]
    requires_confirmation: bool
    expires_at: Optional[datetime]
    status: str
    created_at: datetime

    @field_validator("id", "session_id", mode="before")
    @classmethod
    def convert_uuid(cls, v):
        return str(v)


class SuggestionDecisionRequest(BaseModel):
    """User's response to a suggestion."""
    decision: str

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, v: str) -> str:
        if v not in VALID_DECISIONS:
            raise ValueError(f"Decision must be one of: {', '.join(VALID_DECISIONS)}")
        return v


class SuggestionDecisionResponse(BaseModel):
    """Confirmation that the suggestion response was recorded."""
    suggestion_id: str
    decision: str
    decided_at: datetime
    action_executed: bool


# --------------------------------------------------------------------------- #
# Action Authorization & Safety Schemas                                       #
# --------------------------------------------------------------------------- #

class ActionAuthorizationRequest(BaseModel):
    """Request to mint a cryptographic time-bounded action authorization token."""
    action_id: str
    action_type: str
    category: str
    session_id: str
    parameters: Dict[str, Any] = {}


class ActionAuthorizationTokenResponse(BaseModel):
    """Issued action authorization token."""
    action_token: str
    action_id: str
    action_type: str
    requires_confirmation: bool
    issued_at: datetime
    expires_at: datetime
    scopes_required: List[str]


class ActionExecuteRequest(BaseModel):
    """Execution of a user-confirmed action."""
    action_id: str
    action_token: str
    action_type: str
    confirmed_by_user: bool
    parameters: Dict[str, Any] = {}


class ActionResultResponse(BaseModel):
    """Result of an executed action."""
    success: bool
    action_id: str
    result_code: str
    message: str
    data: Dict[str, Any] = {}
