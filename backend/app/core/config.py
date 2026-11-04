"""
MoodLens Backend - Core Configuration
All settings loaded from environment variables with sensible defaults.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import secrets


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "MoodLens"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = secrets.token_hex(32)
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://moodlens:moodlens_dev_password@localhost:5432/moodlens"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str = secrets.token_hex(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",")]

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    AUTH_RATE_LIMIT_PER_MINUTE: int = 5

    # Spotify OAuth
    SPOTIFY_CLIENT_ID: Optional[str] = None
    SPOTIFY_CLIENT_SECRET: Optional[str] = None
    SPOTIFY_REDIRECT_URI: str = "http://localhost:5173/settings/integrations/spotify/callback"

    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    FROM_EMAIL: str = "noreply@moodlens.app"
    EMAIL_VERIFICATION_ENABLED: bool = False

    # Model
    MODEL_VERSION: str = "1.2.0"


settings = Settings()
