"""
MoodLens Backend - Models Package
Import all models here so Alembic autodiscovery works.
"""
from app.models.user import User, RefreshToken, UserPreferences
from app.models.consent import Consent
from app.models.session import DetectionSession, ExpressionEvent
from app.models.suggestion import Suggestion, SuggestionResponse, ActionEvent, AuditLog
from app.models.integration import Integration, TrustedContact, ModelVersion, Device

__all__ = [
    "User",
    "RefreshToken",
    "UserPreferences",
    "Consent",
    "DetectionSession",
    "ExpressionEvent",
    "Suggestion",
    "SuggestionResponse",
    "ActionEvent",
    "AuditLog",
    "Integration",
    "TrustedContact",
    "ModelVersion",
    "Device",
]
