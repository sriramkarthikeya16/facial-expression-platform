"""
MoodLens Backend - FastAPI Dependencies
Authentication and authorization dependencies.
"""
from __future__ import annotations
import uuid
from typing import Annotated, Optional, List, Any
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError

from app.db.session import get_db
from app.core.security import decode_access_token
from app.models.user import User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extract and validate the JWT access token from the Authorization header.
    Returns the authenticated User object.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_exception

    try:
        payload = decode_access_token(credentials.credentials)
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_uuid = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Alias for get_current_user that ensures user is active."""
    return current_user


def require_role(*roles: Any):
    """
    Factory that returns a dependency enforcing role-based access.

    Usage:
        @router.get("/admin", dependencies=[Depends(require_role("admin"))])
        @router.post("/models", dependencies=[Depends(require_role("ADMIN", "DEVELOPER"))])
    """
    allowed_roles: set[str] = set()
    for r in roles:
        if isinstance(r, (list, tuple, set)):
            allowed_roles.update(str(x).lower() for x in r)
        else:
            allowed_roles.add(str(r).lower())

    async def _check_role(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        user_role = (current_user.role or "").lower()
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {', '.join(allowed_roles)}",
            )
        return current_user
    return _check_role
