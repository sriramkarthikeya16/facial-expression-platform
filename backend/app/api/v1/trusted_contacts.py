"""
MoodLens Backend - Trusted Contacts API Router (Spec Sections 32, 37, 66)
"""
import uuid
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.trusted_contact import (
    TrustedContactCreate,
    TrustedContactUpdate,
    TrustedContactResponse,
)
from app.services.trusted_contact_service import TrustedContactService

router = APIRouter(prefix="/users/me/contacts", tags=["Trusted Contacts"])


@router.get("", response_model=List[TrustedContactResponse])
async def list_trusted_contacts(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """List all trusted contacts for the current user."""
    service = TrustedContactService(db)
    return await service.list_contacts(current_user.id)


@router.get("/favorite", response_model=Optional[TrustedContactResponse])
async def get_favorite_contact(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Get the user's primary favorite contact for emergency escalation."""
    service = TrustedContactService(db)
    return await service.get_favorite(current_user.id)


@router.post("", response_model=TrustedContactResponse, status_code=status.HTTP_201_CREATED)
async def create_trusted_contact(
    data: TrustedContactCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Add a new trusted contact."""
    service = TrustedContactService(db)
    return await service.create_contact(current_user.id, data)


@router.put("/{contact_id}", response_model=TrustedContactResponse)
async def update_trusted_contact(
    contact_id: str,
    data: TrustedContactUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update an existing trusted contact."""
    service = TrustedContactService(db)
    return await service.update_contact(current_user.id, uuid.UUID(contact_id), data)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trusted_contact(
    contact_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Remove a trusted contact."""
    service = TrustedContactService(db)
    await service.delete_contact(current_user.id, uuid.UUID(contact_id))
