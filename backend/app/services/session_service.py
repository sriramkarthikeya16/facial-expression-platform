"""
MoodLens Backend - Session Service
"""
from datetime import datetime, timezone
from typing import Optional, List
import uuid
import math

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.models.session import DetectionSession, ExpressionEvent
from app.models.user import User
from app.schemas.session import (
    CreateSessionRequest, EndSessionRequest,
    BatchExpressionEventsRequest, ExpressionEventCreate,
    SessionStateResponse,
)


class SessionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_session(
        self, user: User, data: CreateSessionRequest
    ) -> DetectionSession:
        """Create a new detection session for the user."""
        # End any active sessions first (single active session per user)
        await self._end_active_sessions(user.id)

        session = DetectionSession(
            user_id=user.id,
            device_id=data.device_id,
            platform=data.platform,
            model_version=data.model_version,
            status="active",
        )
        self.db.add(session)
        await self.db.flush()
        return session

    async def _end_active_sessions(self, user_id: uuid.UUID) -> None:
        """Mark any lingering active sessions as abandoned."""
        result = await self.db.execute(
            select(DetectionSession).where(
                DetectionSession.user_id == user_id,
                DetectionSession.status == "active",
            )
        )
        active_sessions = result.scalars().all()
        now = datetime.now(tz=timezone.utc)
        for s in active_sessions:
            s.status = "abandoned"
            s.ended_at = now
        await self.db.flush()

    async def get_session(
        self, session_id: uuid.UUID, user_id: uuid.UUID
    ) -> DetectionSession:
        """Get a session owned by the user. Raises 404 if not found."""
        result = await self.db.execute(
            select(DetectionSession).where(
                DetectionSession.id == session_id,
                DetectionSession.user_id == user_id,
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )
        return session

    async def delete_session(
        self, session_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        """Delete a specific session owned by the user."""
        session = await self.get_session(session_id, user_id)
        await self.db.delete(session)
        await self.db.flush()

    async def get_session_state(
        self, session_id: uuid.UUID, user_id: uuid.UUID
    ) -> SessionStateResponse:
        """Get real-time expression and tracking state of a session."""
        session = await self.get_session(session_id, user_id)
        
        # Get latest event if available
        result = await self.db.execute(
            select(ExpressionEvent)
            .where(ExpressionEvent.session_id == session_id)
            .order_by(ExpressionEvent.recorded_at.desc())
            .limit(1)
        )
        latest_event = result.scalar_one_or_none()
        now = datetime.now(tz=timezone.utc)

        if latest_event:
            return SessionStateResponse(
                session_id=str(session.id),
                user_id=str(user_id),
                expression=latest_event.expression,
                tracking_state="VISIBLE" if latest_event.expression not in ("no_face", "occluded") else "PARTIAL_OCCLUSION" if latest_event.expression == "occluded" else "UNKNOWN",
                confidence=latest_event.confidence,
                duration_seconds=latest_event.duration_seconds,
                tracking=latest_event.expression != "no_face",
                quality=latest_event.quality_score or 0.95,
                status=session.status,
                timestamp=latest_event.recorded_at,
            )

        return SessionStateResponse(
            session_id=str(session.id),
            user_id=str(user_id),
            expression="no_face",
            tracking_state="UNKNOWN",
            confidence=0.0,
            duration_seconds=0.0,
            tracking=False,
            quality=0.0,
            status=session.status,
            timestamp=now,
        )

    async def end_session(
        self, session_id: uuid.UUID, user_id: uuid.UUID, data: EndSessionRequest
    ) -> DetectionSession:
        """End an active session."""
        session = await self.get_session(session_id, user_id)
        if session.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session is not active",
            )
        now = datetime.now(tz=timezone.utc)
        session.status = "completed"
        session.ended_at = now
        if data.total_duration_seconds is not None:
            session.total_duration_seconds = data.total_duration_seconds
        elif session.started_at:
            session.total_duration_seconds = int(
                (now - session.started_at).total_seconds()
            )
        await self.db.flush()
        return session

    async def list_sessions(
        self, user_id: uuid.UUID, page: int = 1, limit: int = 20,
        status_filter: Optional[str] = None,
    ) -> tuple[List[DetectionSession], int]:
        """List sessions for a user with pagination."""
        query = select(DetectionSession).where(DetectionSession.user_id == user_id)
        count_query = select(func.count()).select_from(DetectionSession).where(
            DetectionSession.user_id == user_id
        )

        if status_filter:
            query = query.where(DetectionSession.status == status_filter)
            count_query = count_query.where(DetectionSession.status == status_filter)

        query = query.order_by(DetectionSession.started_at.desc())
        query = query.offset((page - 1) * limit).limit(limit)

        result = await self.db.execute(query)
        sessions = result.scalars().all()

        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        return list(sessions), total

    async def add_expression_events(
        self, session_id: uuid.UUID, user_id: uuid.UUID,
        data: BatchExpressionEventsRequest,
    ) -> int:
        """Add a batch of aggregated expression events to a session."""
        session = await self.get_session(session_id, user_id)

        now = datetime.now(tz=timezone.utc)
        events = [
            ExpressionEvent(
                session_id=session.id,
                expression=e.expression,
                confidence=e.confidence,
                duration_seconds=e.duration_seconds,
                quality_score=e.quality_score,
                tracking_confidence=e.tracking_confidence,
                model_version=e.model_version,
                recorded_at=e.recorded_at or now,
            )
            for e in data.events
        ]
        self.db.add_all(events)
        await self.db.flush()
        return len(events)

    async def get_session_events(
        self, session_id: uuid.UUID, user_id: uuid.UUID
    ) -> List[ExpressionEvent]:
        """Get all expression events for a session."""
        await self.get_session(session_id, user_id)  # verify ownership
        result = await self.db.execute(
            select(ExpressionEvent)
            .where(ExpressionEvent.session_id == session_id)
            .order_by(ExpressionEvent.recorded_at.asc())
        )
        return list(result.scalars().all())
