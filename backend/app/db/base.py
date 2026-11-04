"""
MoodLens Backend - Database Base Configuration
SQLAlchemy async engine, session factory, and Base model.
Supports PostgreSQL (with asyncpg connection pooling) and local SQLite (aiosqlite).
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData

from app.core.config import settings

# --------------------------------------------------------------------------- #
# Naming convention for Alembic constraint naming                             #
# --------------------------------------------------------------------------- #
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata = MetaData(naming_convention=NAMING_CONVENTION)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    metadata = metadata


# --------------------------------------------------------------------------- #
# Async Engine Factory                                                        #
# --------------------------------------------------------------------------- #
def get_engine():
    db_url = settings.DATABASE_URL
    # Normalize Render / Heroku Postgres URLs to asyncpg dialect
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    if "sqlite" in db_url:
        return create_async_engine(
            db_url,
            echo=settings.DEBUG,
            connect_args={"check_same_thread": False},
        )
    else:
        return create_async_engine(
            db_url,
            pool_size=settings.DATABASE_POOL_SIZE,
            max_overflow=settings.DATABASE_MAX_OVERFLOW,
            pool_pre_ping=True,
            echo=settings.DEBUG,
        )


engine = get_engine()

# --------------------------------------------------------------------------- #
# Session Factory                                                             #
# --------------------------------------------------------------------------- #
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)
