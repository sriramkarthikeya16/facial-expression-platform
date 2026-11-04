"""
MoodLens Backend - Authentication Service
"""
from datetime import datetime, timezone
from typing import Optional
import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError

from app.models.user import User, RefreshToken, UserPreferences
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_refresh_token,
    hash_token,
)
from app.core.config import settings
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, data: RegisterRequest) -> tuple[User, str, str, datetime]:
        """
        Register a new user.
        Returns (user, access_token, refresh_token, refresh_expires_at).
        Raises HTTPException on duplicate email/username.
        """
        # Check for existing email
        email_result = await self.db.execute(
            select(User).where(User.email == data.email.lower())
        )
        if email_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists",
            )

        # Check for existing username
        username_result = await self.db.execute(
            select(User).where(User.username == data.username)
        )
        if username_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username is already taken",
            )

        # Create user
        user = User(
            email=data.email.lower(),
            username=data.username,
            password_hash=hash_password(data.password),
            role="user",
        )
        self.db.add(user)
        await self.db.flush()  # Get the UUID without committing

        # Create default preferences
        prefs = UserPreferences(user_id=user.id)
        self.db.add(prefs)

        # Create tokens
        access_token = create_access_token(str(user.id), user.role)
        refresh_token_str, refresh_expires = create_refresh_token(str(user.id))

        # Store hashed refresh token
        refresh_token = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token_str),
            expires_at=refresh_expires,
        )
        self.db.add(refresh_token)

        await self.db.flush()
        return user, access_token, refresh_token_str, refresh_expires

    async def login(
        self, data: LoginRequest, device_fingerprint: Optional[str] = None
    ) -> tuple[User, str, str, datetime]:
        """
        Authenticate a user and return tokens.
        Returns (user, access_token, refresh_token, refresh_expires_at).
        Raises HTTPException on invalid credentials.
        """
        result = await self.db.execute(
            select(User).where(User.email == data.email.lower())
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        # Create tokens
        access_token = create_access_token(str(user.id), user.role)
        refresh_token_str, refresh_expires = create_refresh_token(str(user.id))

        # Store hashed refresh token
        refresh_token = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token_str),
            expires_at=refresh_expires,
            device_fingerprint=device_fingerprint,
        )
        self.db.add(refresh_token)
        await self.db.flush()

        return user, access_token, refresh_token_str, refresh_expires

    async def refresh(self, refresh_token_str: str) -> tuple[str, User]:
        """
        Exchange a valid refresh token for a new access token.
        Returns (new_access_token, user).
        """
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

        try:
            payload = decode_refresh_token(refresh_token_str)
            user_id: str = payload.get("sub")
            if not user_id:
                raise credentials_exception
        except JWTError:
            raise credentials_exception

        # Verify token exists and is not revoked
        token_hash = hash_token(refresh_token_str)
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked == False,
                RefreshToken.expires_at > datetime.now(tz=timezone.utc),
            )
        )
        stored_token = result.scalar_one_or_none()

        if not stored_token:
            raise credentials_exception

        # Get user
        user_result = await self.db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        user = user_result.scalar_one_or_none()

        if not user or not user.is_active:
            raise credentials_exception

        # Issue new access token
        new_access_token = create_access_token(str(user.id), user.role)
        return new_access_token, user

    async def logout(self, refresh_token_str: str) -> None:
        """Revoke a refresh token."""
        token_hash = hash_token(refresh_token_str)
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        stored_token = result.scalar_one_or_none()
        if stored_token:
            stored_token.revoked = True
            await self.db.flush()
