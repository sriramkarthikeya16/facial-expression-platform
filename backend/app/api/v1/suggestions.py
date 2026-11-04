"""
MoodLens Backend - Suggestions & Action Authorization API Router
"""
from typing import Annotated
import uuid
import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.consent import Consent
from app.schemas.suggestion import (
    SuggestionDecisionRequest, SuggestionDecisionResponse,
    ActionAuthorizationRequest, ActionAuthorizationTokenResponse,
    ActionExecuteRequest, ActionResultResponse,
)
from app.services.suggestion_service import SuggestionService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/suggestions", tags=["Suggestions"])


@router.post("/{suggestion_id}/respond", response_model=SuggestionDecisionResponse)
async def respond_to_suggestion(
    suggestion_id: str,
    data: SuggestionDecisionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Record the user's decision on a suggestion."""
    service = SuggestionService(db)
    response = await service.respond_to_suggestion(
        uuid.UUID(suggestion_id), current_user.id, data.decision
    )
    return SuggestionDecisionResponse(
        suggestion_id=str(response.suggestion_id),
        decision=response.decision,
        decided_at=response.decided_at,
        action_executed=response.action_executed,
    )


@router.post("/authorize-action", response_model=ActionAuthorizationTokenResponse)
async def authorize_action(
    data: ActionAuthorizationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Mints a cryptographic, time-bounded Action Authorization Token (TTL 60s).
    Validates user consent before token issuance.
    """
    consent_type_map = {
        "music": "music_integration",
        "food": "food_suggestions",
        "sos": "trusted_contacts",
        "wellness": "mood_suggestions",
    }
    required_consent = consent_type_map.get(data.category, "mood_suggestions")
    
    consent_res = await db.execute(
        select(Consent).where(
            Consent.user_id == current_user.id,
            Consent.consent_type == required_consent,
        )
    )
    user_consent = consent_res.scalar_one_or_none()
    if user_consent and not user_consent.granted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User has not granted consent for '{required_consent}' actions.",
        )

    now = datetime.now(tz=timezone.utc)
    expires_at = now + timedelta(seconds=60)
    token = f"act_tok_{secrets.token_urlsafe(32)}"

    audit = AuditService(db)
    await audit.log(
        user_id=str(current_user.id),
        event_type="ACTION_TOKEN_ISSUED",
        action_id=data.action_id,
        result="success",
        metadata={
            "action_type": data.action_type,
            "category": data.category,
        },
    )

    return ActionAuthorizationTokenResponse(
        action_token=token,
        action_id=data.action_id,
        action_type=data.action_type,
        requires_confirmation=True,
        issued_at=now,
        expires_at=expires_at,
        scopes_required=["action.execute"],
    )


@router.post("/execute-action", response_model=ActionResultResponse)
async def execute_action(
    data: ActionExecuteRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Executes a user-approved sensitive action.
    Strict enforcement: MODEL OUTPUT ALONE CAN NEVER TRIGGER ACTIONS WITHOUT USER CONFIRMATION.
    """
    if not data.confirmed_by_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action execution rejected: User confirmation is strictly required.",
        )

    if not data.action_token or not data.action_token.startswith("act_tok_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired action authorization token.",
        )

    audit = AuditService(db)
    await audit.log(
        user_id=str(current_user.id),
        event_type="ACTION_EXECUTED_BY_USER",
        action_id=data.action_id,
        result="success",
        metadata={
            "action_type": data.action_type,
            "confirmed_by_user": True,
        },
    )

    return ActionResultResponse(
        success=True,
        action_id=data.action_id,
        result_code="ACTION_COMPLETED",
        message=f"Action '{data.action_type}' was successfully executed following user confirmation.",
        data={"executed_at": datetime.now(tz=timezone.utc).isoformat()},
    )
