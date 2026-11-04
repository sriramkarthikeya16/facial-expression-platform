"""
MoodLens Backend - Audit Service
Logs sensitive actions with privacy-preserving design.
NEVER logs: raw video, biometric data, phone numbers, access tokens.
"""
import json
from typing import Optional, Any
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.suggestion import AuditLog
from app.core.security import hash_user_id_for_audit


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        user_id: str,
        event_type: str,
        action_id: Optional[str] = None,
        model_version: Optional[str] = None,
        source: Optional[str] = None,
        result: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> None:
        """
        Write an audit log entry.

        Args:
            user_id: The user's UUID string (will be SHA-256 hashed).
            event_type: Event classification (e.g., CALL_REQUESTED, LOGIN).
            metadata: Non-PII context dictionary only.
        """
        meta_str = json.dumps(metadata) if isinstance(metadata, (dict, list)) else metadata
        entry = AuditLog(
            user_id_hash=hash_user_id_for_audit(user_id),
            event_type=event_type,
            action_id=action_id,
            model_version=model_version,
            source=source,
            result=result,
            metadata_json=meta_str,
        )
        self.db.add(entry)
        await self.db.flush()
