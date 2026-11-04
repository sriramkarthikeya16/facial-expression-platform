"""
MoodLens Backend - Trusted Contact Service
Handles CRUD operations for emergency contacts used during Level 4 & 5 escalation.
"""
import uuid
from typing import List, Optional
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.integration import TrustedContact
from app.schemas.trusted_contact import TrustedContactCreate, TrustedContactUpdate


class TrustedContactService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_contacts(self, user_id: uuid.UUID) -> List[TrustedContact]:
        stmt = (
            select(TrustedContact)
            .where(TrustedContact.user_id == user_id)
            .order_by(TrustedContact.is_favorite.desc(), TrustedContact.created_at.desc())
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_favorite(self, user_id: uuid.UUID) -> Optional[TrustedContact]:
        stmt = (
            select(TrustedContact)
            .where(TrustedContact.user_id == user_id, TrustedContact.is_favorite == True)
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_contact(self, user_id: uuid.UUID, contact_id: uuid.UUID) -> TrustedContact:
        stmt = select(TrustedContact).where(
            TrustedContact.id == contact_id,
            TrustedContact.user_id == user_id,
        )
        res = await self.db.execute(stmt)
        contact = res.scalar_one_or_none()
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trusted contact not found",
            )
        return contact

    async def create_contact(self, user_id: uuid.UUID, data: TrustedContactCreate) -> TrustedContact:
        if data.is_favorite:
            # Un-favorite any existing favorite contacts
            await self.db.execute(
                update(TrustedContact)
                .where(TrustedContact.user_id == user_id)
                .values(is_favorite=False)
            )

        contact = TrustedContact(
            user_id=user_id,
            name=data.name,
            phone_number=data.phone_number,
            relationship=data.relationship,
            is_favorite=data.is_favorite,
        )
        self.db.add(contact)
        await self.db.commit()
        await self.db.refresh(contact)
        return contact

    async def update_contact(
        self, user_id: uuid.UUID, contact_id: uuid.UUID, data: TrustedContactUpdate
    ) -> TrustedContact:
        contact = await self.get_contact(user_id, contact_id)

        if data.is_favorite is True:
            await self.db.execute(
                update(TrustedContact)
                .where(TrustedContact.user_id == user_id)
                .values(is_favorite=False)
            )

        if data.name is not None:
            contact.name = data.name
        if data.phone_number is not None:
            contact.phone_number = data.phone_number
        if data.relationship is not None:
            contact.relationship = data.relationship
        if data.is_favorite is not None:
            contact.is_favorite = data.is_favorite

        await self.db.commit()
        await self.db.refresh(contact)
        return contact

    async def delete_contact(self, user_id: uuid.UUID, contact_id: uuid.UUID) -> None:
        contact = await self.get_contact(user_id, contact_id)
        await self.db.delete(contact)
        await self.db.commit()
