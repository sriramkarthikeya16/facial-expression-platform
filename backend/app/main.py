"""
MoodLens Backend - FastAPI Application Entry Point
"""
import sys
from pathlib import Path

# Ensure backend root is always on sys.path
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

import structlog
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.core.limiter import limiter
from app.core.config import settings
from app.api.v1.router import api_router
from app.db.base import engine
from app.db.session import AsyncSessionLocal
from app.websocket.handlers import handle_websocket

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("MoodLens backend starting", env=settings.APP_ENV)
    from app.db.base import Base
    import app.models  # noqa: F401
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.warning("Auto table creation notice", error=str(e))
    yield
    logger.info("MoodLens backend shutting down")
    await engine.dispose()


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="MoodLens API",
        description=(
            "Real-Time Facial Expression Detection Platform API.\n\n"
            "**Privacy Note**: All facial inference runs in the browser. "
            "Raw video frames are never transmitted to this server."
        ),
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # ── Rate Limiting ────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── CORS ─────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Security Headers ─────────────────────────────────────────────
    from starlette.types import ASGIApp, Receive, Scope, Send

    class SecurityHeadersMiddleware:
        def __init__(self, app: ASGIApp):
            self.app = app

        async def __call__(self, scope: Scope, receive: Receive, send: Send):
            if scope["type"] != "http":
                await self.app(scope, receive, send)
                return

            async def send_with_security_headers(message):
                if message["type"] == "http.response.start":
                    headers = list(message.get("headers", []))
                    security_headers = [
                        (b"content-security-policy", b"default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss: https:; img-src 'self' data: https:;"),
                        (b"x-content-type-options", b"nosniff"),
                        (b"x-frame-options", b"DENY"),
                        (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
                        (b"x-xss-protection", b"1; mode=block"),
                        (b"referrer-policy", b"strict-origin-when-cross-origin"),
                    ]
                    headers.extend(security_headers)
                    message["headers"] = headers
                await send(message)

            await self.app(scope, receive, send_with_security_headers)

    app.add_middleware(SecurityHeadersMiddleware)

    # ── Global Exception Handler ─────────────────────────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        # Log internally but never expose internal details to clients
        logger.error(
            "Unhandled exception",
            exc_type=type(exc).__name__,
            path=str(request.url.path),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal error occurred"},
        )

    # ── API Routes ───────────────────────────────────────────────────
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # ── WebSocket Endpoint ───────────────────────────────────────────
    @app.websocket("/api/v1/ws/{session_id}")
    async def websocket_endpoint(websocket: WebSocket, session_id: str):
        """
        Real-time WebSocket endpoint for expression streaming.

        Protocol:
        1. Connect
        2. Send: {"type": "auth", "token": "<access_token>"}
        3. Receive: {"type": "ready", "session_id": "..."}
        4. Send expression updates; receive suggestions
        """
        async with AsyncSessionLocal() as db:
            await handle_websocket(websocket, session_id, db)

    # ── Utility Endpoints ────────────────────────────────────────────
    @app.get("/health", tags=["Health"])
    async def health_check():
        """Health check endpoint for load balancers."""
        return {
            "status": "healthy",
            "app": settings.APP_NAME,
            "env": settings.APP_ENV,
            "version": "1.0.0",
        }

    @app.get("/", tags=["Root"])
    async def root():
        return {
            "app": settings.APP_NAME,
            "version": "1.0.0",
            "docs": "/docs" if settings.DEBUG else "disabled",
            "privacy": "All facial inference runs on-device. No video is transmitted.",
        }

    return app


app = create_application()
