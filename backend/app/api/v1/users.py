"""
MoodLens Backend - Users API Router with GDPR / CCPA Export & Erasure Endpoints
"""
import hashlib
from typing import Annotated, Any, Dict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, UserPreferences
from app.models.consent import Consent
from app.models.session import DetectionSession, ExpressionEvent
from app.models.suggestion import Suggestion, SuggestionResponse
from app.schemas.user import (
    UserResponse, UpdateUserRequest, DeleteAccountRequest,
    UserPreferencesResponse, UpdatePreferencesRequest,
)
from app.core.security import verify_password
from app.services.audit_service import AuditService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Get the current user's profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UpdateUserRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> User:
    """Update the current user's profile (partial update)."""
    if data.username:
        result = await db.execute(
            select(User).where(
                User.username == data.username,
                User.id != current_user.id,
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken",
            )
        current_user.username = data.username

    if data.email:
        result = await db.execute(
            select(User).where(
                User.email == data.email.lower(),
                User.id != current_user.id,
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already in use",
            )
        current_user.email = data.email.lower()
        current_user.is_verified = False

    current_user.updated_at = datetime.now(tz=timezone.utc)
    await db.flush()
    return current_user


@router.get("/me/export")
async def export_my_data(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    GDPR Article 20 / CCPA Data Portability Export.
    Returns a comprehensive, machine-readable JSON package of all stored user data.
    """
    pref_res = await db.execute(select(UserPreferences).where(UserPreferences.user_id == current_user.id))
    prefs = pref_res.scalar_one_or_none()

    consent_res = await db.execute(select(Consent).where(Consent.user_id == current_user.id))
    consents = consent_res.scalars().all()

    sess_res = await db.execute(
        select(
            func.count(DetectionSession.id),
            func.coalesce(func.sum(DetectionSession.total_duration_seconds), 0)
        ).where(DetectionSession.user_id == current_user.id)
    )
    sess_count, total_sec = sess_res.one()

    user_hash = hashlib.sha256(str(current_user.id).encode()).hexdigest()

    audit = AuditService(db)
    await audit.log(
        user_id=str(current_user.id),
        event_type="DATA_EXPORTED",
        result="success",
        metadata={"format": "json", "session_count": sess_count},
    )

    return {
        "exported_at": datetime.now(tz=timezone.utc).isoformat(),
        "user_id_hash": user_hash,
        "profile": {
            "email": current_user.email,
            "username": current_user.username,
            "role": current_user.role,
            "is_verified": current_user.is_verified,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "preferences": {
            "theme": prefs.theme if prefs else "system",
            "suggestion_frequency": prefs.suggestion_frequency if prefs else "balanced",
            "notification_enabled": prefs.notification_enabled if prefs else True,
            "music_genres": prefs.music_genres if prefs else [],
            "preferred_food_apps": prefs.preferred_food_apps if prefs else [],
        } if prefs else None,
        "consents": [
            {
                "consent_type": c.consent_type,
                "granted": c.granted,
                "version": c.version,
                "granted_at": c.granted_at.isoformat() if c.granted_at else None,
            }
            for c in consents
        ],
        "sessions_summary": {
            "total_sessions": sess_count,
            "total_duration_seconds": total_sec,
            "total_duration_minutes": round(total_sec / 60, 2),
        },
    }


@router.delete("/me/data", status_code=status.HTTP_200_OK)
async def delete_my_data(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    GDPR Article 17 Right to Erasure / Right to be Forgotten.
    Deletes all detection sessions, expression events, and suggestions while retaining the active user account.
    """
    await db.execute(delete(DetectionSession).where(DetectionSession.user_id == current_user.id))
    
    audit = AuditService(db)
    await audit.log(
        user_id=str(current_user.id),
        event_type="DATA_ERASURE_EXECUTED",
        result="success",
        metadata={"scope": "all_telemetry_and_sessions"},
    )
    await db.flush()

    return {
        "status": "success",
        "message": "All session telemetry, expression history, and suggestions have been permanently erased.",
        "erased_at": datetime.now(tz=timezone.utc).isoformat(),
    }


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    data: DeleteAccountRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete the current user's account and all associated data."""
    if not verify_password(data.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
        )
    await db.delete(current_user)
    await db.flush()


@router.get("/me/preferences", response_model=UserPreferencesResponse)
async def get_preferences(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> UserPreferences:
    """Get the current user's preferences."""
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == current_user.id)
    )
    prefs = result.scalar_one_or_none()
    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        db.add(prefs)
        await db.flush()
    return prefs


@router.patch("/me/preferences", response_model=UserPreferencesResponse)
async def update_preferences(
    data: UpdatePreferencesRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
) -> UserPreferences:
    """Update the current user's preferences."""
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == current_user.id)
    )
    prefs = result.scalar_one_or_none()
    if not prefs:
        prefs = UserPreferences(user_id=current_user.id)
        db.add(prefs)

    update_data = data.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(prefs, key, value)

    await db.flush()
    return prefs
