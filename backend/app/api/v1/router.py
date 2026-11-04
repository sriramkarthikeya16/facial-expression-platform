"""
MoodLens Backend - API v1 Router
Aggregates all v1 API sub-routers.
"""
from fastapi import APIRouter

from app.api.v1 import auth, users, sessions, consents, suggestions, models, trusted_contacts, admin

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(sessions.router)
api_router.include_router(consents.router)
api_router.include_router(suggestions.router)
api_router.include_router(models.router)
api_router.include_router(trusted_contacts.router)
api_router.include_router(admin.router)
