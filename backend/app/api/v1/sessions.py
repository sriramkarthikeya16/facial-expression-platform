"""
MoodLens Backend - Sessions API Router
"""
import math
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.limiter import limiter
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.session import (
    CreateSessionRequest, SessionResponse, EndSessionRequest,
    BatchExpressionEventsRequest, ExpressionEventResponse,
    PaginatedSessionsResponse, SessionStateResponse,
)
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SessionResponse)
@limiter.limit("30/minute")
async def create_session(
    request: Request,
    data: CreateSessionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Create a new expression detection session."""
    service = SessionService(db)
    session = await service.create_session(current_user, data)
    return session


@router.get("", response_model=PaginatedSessionsResponse)
@limiter.limit("30/minute")
async def list_sessions(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status: Optional[str] = Query(default=None),
):
    """List sessions for the current user (paginated)."""
    service = SessionService(db)
    sessions, total = await service.list_sessions(current_user.id, page, limit, status)
    pages = math.ceil(total / limit) if total else 0
    return PaginatedSessionsResponse(
        items=sessions,
        total=total,
        page=page,
        pages=pages,
        limit=limit,
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Get a specific session."""
    service = SessionService(db)
    return await service.get_session(uuid.UUID(session_id), current_user.id)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Delete a specific session and its recorded events."""
    service = SessionService(db)
    await service.delete_session(uuid.UUID(session_id), current_user.id)


@router.get("/{session_id}/state", response_model=SessionStateResponse)
async def get_session_state(
    session_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Get the current live expression and tracking state of a session (Spec Section 23)."""
    service = SessionService(db)
    return await service.get_session_state(uuid.UUID(session_id), current_user.id)


@router.patch("/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: str,
    data: EndSessionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """End an active session."""
    service = SessionService(db)
    return await service.end_session(uuid.UUID(session_id), current_user.id, data)


@router.post("/{session_id}/events", status_code=status.HTTP_201_CREATED)
async def add_expression_events(
    session_id: str,
    data: BatchExpressionEventsRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Add a batch of aggregated expression events to a session."""
    service = SessionService(db)
    count = await service.add_expression_events(
        uuid.UUID(session_id), current_user.id, data
    )
    return {"recorded": count}


@router.get("/{session_id}/events", response_model=list[ExpressionEventResponse])
async def get_session_events(
    session_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Get all expression events for a session."""
    service = SessionService(db)
    return await service.get_session_events(uuid.UUID(session_id), current_user.id)
