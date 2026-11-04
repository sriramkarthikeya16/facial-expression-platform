"""
MoodLens Backend - Security Utilities
Password hashing, JWT creation/verification.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
import hashlib
import uuid

import bcrypt
from jose import jwt, JWTError

from app.core.config import settings


# --------------------------------------------------------------------------- #
# Password Hashing                                                            #
# --------------------------------------------------------------------------- #

def hash_password(plain_password: str) -> str:
    """Hash a plaintext password with bcrypt (cost factor 12)."""
    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


# --------------------------------------------------------------------------- #
# Token Hashing (for storing refresh tokens in DB)                            #
# --------------------------------------------------------------------------- #

def hash_token(token: str) -> str:
    """SHA-256 hash of a token for secure database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_user_id_for_audit(user_id: str) -> str:
    """SHA-256 hash of user ID for audit logs (one-way, for privacy)."""
    return hashlib.sha256(user_id.encode("utf-8")).hexdigest()


# --------------------------------------------------------------------------- #
# JWT                                                                         #
# --------------------------------------------------------------------------- #

def create_access_token(
    subject: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a short-lived JWT access token.

    Args:
        subject: The user's UUID string.
        role: The user's role string.
        expires_delta: Optional custom expiry; defaults to settings value.

    Returns:
        Encoded JWT string.
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    now = datetime.now(tz=timezone.utc)
    expire = now + expires_delta

    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": expire,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(
    subject: str,
    expires_delta: Optional[timedelta] = None,
) -> tuple[str, datetime]:
    """
    Create a long-lived JWT refresh token.

    Returns:
        Tuple of (encoded JWT string, expiry datetime).
    """
    if expires_delta is None:
        expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    now = datetime.now(tz=timezone.utc)
    expire = now + expires_delta

    payload: dict[str, Any] = {
        "sub": subject,
        "type": "refresh",
        "iat": now,
        "exp": expire,
        "jti": str(uuid.uuid4()),
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expire


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT token.

    Raises:
        JWTError: If the token is invalid or expired.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT access token, confirming type claim.

    Raises:
        JWTError: If invalid, expired, or not an access token.
    """
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise JWTError("Not an access token")
    return payload


def decode_refresh_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT refresh token, confirming type claim.

    Raises:
        JWTError: If invalid, expired, or not a refresh token.
    """
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise JWTError("Not a refresh token")
    return payload
