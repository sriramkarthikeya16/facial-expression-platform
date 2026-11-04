"""
MoodLens Backend - Consent Service
"""
from datetime import datetime, timezone
from typing import List, Optional
import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.consent import Consent
from app.models.user import User


class ConsentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_consents(self, user_id: uuid.UUID) -> List[Consent]:
        """Get all consent records for a user."""
        result = await self.db.execute(
            select(Consent).where(Consent.user_id == user_id)
        )
        return list(result.scalars().all())

    async def upsert_consent(
        self,
        user_id: uuid.UUID,
        consent_type: str,
        granted: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Consent:
        """Grant or update a consent (upsert by user_id + consent_type)."""
        result = await self.db.execute(
            select(Consent).where(
                Consent.user_id == user_id,
                Consent.consent_type == consent_type,
            )
        )
        consent = result.scalar_one_or_none()
        now = datetime.now(tz=timezone.utc)

        if consent:
            consent.granted = granted
            if granted:
                consent.granted_at = now
                consent.revoked_at = None
            else:
                consent.revoked_at = now
        else:
            consent = Consent(
                user_id=user_id,
                consent_type=consent_type,
                granted=granted,
                granted_at=now if granted else None,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            self.db.add(consent)

        await self.db.flush()
        return consent

    async def check_consent(
        self, user_id: uuid.UUID, consent_type: str
    ) -> bool:
        """Check if a user has granted a specific consent."""
        result = await self.db.execute(
            select(Consent).where(
                Consent.user_id == user_id,
                Consent.consent_type == consent_type,
                Consent.granted == True,
            )
        )
        return result.scalar_one_or_none() is not None
