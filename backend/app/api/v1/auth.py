"""
MoodLens Backend - Authentication API Router
"""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Cookie, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.auth import RegisterRequest, LoginRequest
from app.services.auth_service import AuthService
from app.core.config import settings
from app.core.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth/refresh"


def _set_refresh_cookie(response: Response, token: str, expires_at) -> None:
    """Set the refresh token as an httpOnly, Secure cookie."""
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.APP_ENV != "development",
        samesite="strict",
        path=REFRESH_COOKIE_PATH,
        max_age=max_age,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Register a new user account."""
    service = AuthService(db)
    user, access_token, refresh_token, refresh_expires = await service.register(data)

    response_data = {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "role": user.role,
            "is_verified": user.is_verified,
        },
    }

    response = JSONResponse(content=response_data, status_code=status.HTTP_201_CREATED)
    _set_refresh_cookie(response, refresh_token, refresh_expires)
    return response


@router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Authenticate and receive tokens."""
    service = AuthService(db)
    user, access_token, refresh_token, refresh_expires = await service.login(data)

    response_data = {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "role": user.role,
            "is_verified": user.is_verified,
        },
    }

    response = JSONResponse(content=response_data)
    _set_refresh_cookie(response, refresh_token, refresh_expires)
    return response


@router.post("/refresh")
async def refresh_token(
    request: Request,
    refresh_token: str = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Exchange a valid refresh token cookie for a new access token."""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
        )

    service = AuthService(db)
    new_access_token, user = await service.refresh(refresh_token)

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/logout")
async def logout(
    request: Request,
    refresh_token: str = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Revoke the refresh token and clear the cookie."""
    service = AuthService(db)
    if refresh_token:
        await service.logout(refresh_token)

    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
    return response
