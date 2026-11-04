"""
MoodLens Backend - Database Session Dependency
FastAPI dependency for injecting async database sessions.
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides an async database session.
    Automatically commits on success, rolls back on exception,
    and always closes the session.

    Usage:
        @router.get("/example")
        async def endpoint(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
