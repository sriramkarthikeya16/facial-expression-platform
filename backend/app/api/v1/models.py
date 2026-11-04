"""
MoodLens Backend - Model Registry API Router
"""
from typing import Annotated, Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.model_registry import ModelRegistry
from app.schemas.model_registry import (
    ModelRegisterRequest, ModelResponse, ModelRegistryListResponse
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/models", tags=["Model Registry"])


@router.get("", response_model=ModelRegistryListResponse)
async def list_models(
    db: AsyncSession = Depends(get_db),
    quantization: Optional[str] = Query(default=None),
) -> ModelRegistryListResponse:
    """List all registered ML models with architecture and evaluation metadata."""
    query = select(ModelRegistry).order_by(ModelRegistry.created_at.desc())
    if quantization:
        query = query.where(ModelRegistry.quantization == quantization)

    result = await db.execute(query)
    models = list(result.scalars().all())

    active_id = None
    for m in models:
        if m.is_active:
            active_id = m.model_id
            break

    return ModelRegistryListResponse(
        models=models,
        active_model_id=active_id,
        total=len(models),
    )


@router.get("/active", response_model=ModelResponse)
async def get_active_model(
    db: AsyncSession = Depends(get_db),
) -> ModelRegistry:
    """Get metadata for the currently active production model."""
    result = await db.execute(
        select(ModelRegistry).where(ModelRegistry.is_active == True)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active model found in registry",
        )
    return model


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
) -> ModelRegistry:
    """Get metadata, SHA-256 hash, and benchmark details for a specific model."""
    result = await db.execute(
        select(ModelRegistry).where(ModelRegistry.model_id == model_id)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model with ID '{model_id}' not found in registry",
        )
    return model


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ModelResponse)
async def register_model(
    data: ModelRegisterRequest,
    current_user: Annotated[User, Depends(require_role(["ADMIN", "DEVELOPER"]))],
    db: AsyncSession = Depends(get_db),
) -> ModelRegistry:
    """Register a new production or candidate model release."""
    existing = await db.execute(
        select(ModelRegistry).where(ModelRegistry.model_id == data.model_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Model with ID '{data.model_id}' is already registered",
        )

    if data.is_active:
        # Deactivate previous active models with same quantization
        await db.execute(
            update(ModelRegistry)
            .where(ModelRegistry.quantization == data.quantization)
            .values(is_active=False)
        )

    new_model = ModelRegistry(**data.model_dump())
    db.add(new_model)
    await db.flush()

    audit = AuditService(db)
    await audit.log(
        user_id=str(current_user.id),
        event_type="MODEL_REGISTERED",
        result="success",
        metadata={
            "model_id": data.model_id,
            "version": data.version,
            "quantization": data.quantization,
            "sha256": data.sha256_hash,
        },
    )

    return new_model


@router.post("/{model_id}/activate", response_model=ModelResponse)
async def activate_model(
    model_id: str,
    current_user: Annotated[User, Depends(require_role("ADMIN", "DEVELOPER"))],
    db: AsyncSession = Depends(get_db),
) -> ModelRegistry:
    """Activate a specific model release in the registry."""
    result = await db.execute(
        select(ModelRegistry).where(ModelRegistry.model_id == model_id)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target model '{model_id}' not found in registry",
        )

    # Deactivate other models of same quantization and activate this model
    await db.execute(
        update(ModelRegistry)
        .where(ModelRegistry.quantization == model.quantization)
        .values(is_active=False)
    )
    model.is_active = True
    await db.flush()

    audit = AuditService(db)
    await audit.log(
        user_id=str(current_user.id),
        event_type="MODEL_ACTIVATED",
        result="success",
        metadata={"activated_model_id": model.model_id, "version": model.version},
    )

    return model


@router.post("/{model_id}/rollback", response_model=ModelResponse)
async def rollback_model(
    model_id: str,
    current_user: Annotated[User, Depends(require_role(["ADMIN"]))],
    db: AsyncSession = Depends(get_db),
) -> ModelRegistry:
    """Rollback to a specified stable model version in the registry."""
    result = await db.execute(
        select(ModelRegistry).where(ModelRegistry.model_id == model_id)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target model '{model_id}' not found for rollback",
        )

    # Deactivate other models of same quantization and activate this model
    await db.execute(
        update(ModelRegistry)
        .where(ModelRegistry.quantization == model.quantization)
        .values(is_active=False)
    )
    model.is_active = True
    await db.flush()

    audit = AuditService(db)
    await audit.log(
        user_id=str(current_user.id),
        event_type="MODEL_ROLLBACK_EXECUTED",
        result="success",
        metadata={"activated_model_id": model.model_id, "version": model.version},
    )

    return model
