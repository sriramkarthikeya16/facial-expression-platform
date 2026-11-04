"""
MoodLens Integration Tests - Admin Telemetry & Observability Aggregation
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_admin_telemetry_access_control(client: AsyncClient):
    # 1. No token -> 401
    unauth_res = await client.get("/api/v1/admin/telemetry")
    assert unauth_res.status_code == 401

    # 2. Regular user -> 403 Forbidden
    reg_user = await client.post(
        "/api/v1/auth/register",
        json={"email": "regular_u@moodlens.app", "password": "UserPass12345!", "username": "reguser"},
    )
    assert reg_user.status_code == 201
    user_token = reg_user.json()["access_token"]
    user_res = await client.get(
        "/api/v1/admin/telemetry",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert user_res.status_code == 403


@pytest.mark.asyncio
async def test_admin_telemetry_live_aggregation(client: AsyncClient):
    # 1. Register admin user
    admin_reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "telemetry_admin@moodlens.app", "password": "AdminPassword123!", "username": "telem_admin"},
    )
    assert admin_reg.status_code == 201
    admin_id = admin_reg.json()["user"]["id"]
    admin_token = admin_reg.json()["access_token"]

    # Promote to admin in DB
    from conftest import TestAsyncSessionLocal
    from app.models.user import User
    from sqlalchemy import update
    import uuid

    async with TestAsyncSessionLocal() as session:
        await session.execute(
            update(User).where(User.id == uuid.UUID(admin_id)).values(role="admin")
        )
        await session.commit()

    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Create detection session and add events
    sess_res = await client.post(
        "/api/v1/sessions",
        json={"platform": "web", "model_version": "1.0.0"},
        headers=admin_headers,
    )
    assert sess_res.status_code == 201
    session_id = sess_res.json()["id"]

    # Add 3 events: 2 happy, 1 surprise
    events_payload = {
        "events": [
            {
                "expression": "happy",
                "confidence": 0.90,
                "duration_seconds": 3.0,
                "model_version": "1.0.0",
            },
            {
                "expression": "happy",
                "confidence": 0.80,
                "duration_seconds": 3.0,
                "model_version": "1.0.0",
            },
            {
                "expression": "surprise",
                "confidence": 0.70,
                "duration_seconds": 2.0,
                "model_version": "1.0.0",
            },
        ]
    }
    batch_res = await client.post(
        f"/api/v1/sessions/{session_id}/events",
        json=events_payload,
        headers=admin_headers,
    )
    assert batch_res.status_code == 201

    # 3. Request admin telemetry
    telem_res = await client.get("/api/v1/admin/telemetry", headers=admin_headers)
    assert telem_res.status_code == 200
    data = telem_res.json()

    assert data["total_sessions"] >= 1
    assert data["total_events"] >= 3
    assert data["zero_biometric_storage_verified"] is True
    assert data["gdpr_audit_compliant"] is True

    # Verify emotion frequencies contain Happy and Surprise
    em_map = {item["name"]: item for item in data["emotion_frequencies"]}
    assert "Happy" in em_map
    assert "Surprise" in em_map
    assert em_map["Happy"]["count"] >= 2
    assert em_map["Surprise"]["count"] >= 1
