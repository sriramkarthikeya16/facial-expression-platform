"""
MoodLens Backend - Suggestion Service
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.suggestion import Suggestion, SuggestionResponse as SuggestionResponseModel
from app.models.user import User


class SuggestionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_suggestion(
        self, suggestion_id: uuid.UUID, user_id: uuid.UUID
    ) -> Suggestion:
        """Get a suggestion owned by the user."""
        result = await self.db.execute(
            select(Suggestion).where(
                Suggestion.id == suggestion_id,
                Suggestion.user_id == user_id,
            )
        )
        suggestion = result.scalar_one_or_none()
        if not suggestion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Suggestion not found",
            )
        return suggestion

    async def respond_to_suggestion(
        self, suggestion_id: uuid.UUID, user_id: uuid.UUID, decision: str
    ) -> SuggestionResponseModel:
        """Record the user's response to a suggestion."""
        suggestion = await self.get_suggestion(suggestion_id, user_id)

        # Check if already responded
        if suggestion.status not in ("pending",):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Suggestion has already been {suggestion.status}",
            )

        # Check expiry
        if suggestion.expires_at:
            exp = suggestion.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < datetime.now(tz=timezone.utc):
                suggestion.status = "expired"
                await self.db.flush()
                raise HTTPException(
                    status_code=status.HTTP_410_GONE,
                    detail="Suggestion has expired",
                )

        # Update suggestion status
        suggestion.status = decision

        # Create response record
        response = SuggestionResponseModel(
            suggestion_id=suggestion.id,
            decision=decision,
            action_executed=False,  # Action execution happens client-side after confirmation
        )
        self.db.add(response)
        await self.db.flush()

        return response

    async def create_suggestion(
        self,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        rule_id: str,
        category: str,
        expression_trigger: Optional[str] = None,
        confidence_at_trigger: Optional[float] = None,
        requires_confirmation: bool = True,
        expires_in_seconds: int = 30,
    ) -> Suggestion:
        """Create a new suggestion (called from WebSocket handler or rule engine)."""
        expires_at = datetime.now(tz=timezone.utc) + timedelta(seconds=expires_in_seconds)
        suggestion = Suggestion(
            session_id=session_id,
            user_id=user_id,
            rule_id=rule_id,
            category=category,
            expression_trigger=expression_trigger,
            confidence_at_trigger=confidence_at_trigger,
            requires_confirmation=requires_confirmation,
            expires_at=expires_at,
            status="pending",
        )
        self.db.add(suggestion)
        await self.db.flush()
        return suggestion
