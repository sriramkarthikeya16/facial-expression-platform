"""
MoodLens Backend - Consents API Router
"""
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.suggestion import ConsentRequest, ConsentResponse, AllConsentsResponse
from app.services.consent_service import ConsentService

router = APIRouter(prefix="/consents", tags=["Consents"])


@router.get("", response_model=AllConsentsResponse)
async def get_consents(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Get all consent settings for the current user."""
    service = ConsentService(db)
    consents = await service.get_all_consents(current_user.id)
    return AllConsentsResponse(consents=consents)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ConsentResponse)
async def upsert_consent(
    data: ConsentRequest,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Grant or update a consent."""
    service = ConsentService(db)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    consent = await service.upsert_consent(
        current_user.id, data.consent_type, data.granted, ip, ua
    )
    return consent
