"""
MoodLens Integration Tests - Suggestions API (Respond, Authorize, Execute)
"""
import pytest
from httpx import AsyncClient
import uuid
from datetime import datetime, timezone, timedelta

from conftest import TestAsyncSessionLocal
from app.models.session import DetectionSession
from app.models.suggestion import Suggestion
from app.models.consent import Consent


@pytest.mark.asyncio
async def test_suggestions_lifecycle_and_execution(client: AsyncClient):
    # 1. Register User with unique credentials
    unique_id = uuid.uuid4().hex[:8]
    email = f"sug_{unique_id}@moodlens.app"
    username = f"sug_{unique_id}"
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password12345!", "username": username},
    )
    assert reg_res.status_code == 201
    user_id = reg_res.json()["user"]["id"]
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Grant music and wellness consent
    async with TestAsyncSessionLocal() as session:
        session.add(Consent(
            user_id=uuid.UUID(user_id),
            consent_type="music_integration",
            granted=True,
            version="1.0",
        ))
        session.add(Consent(
            user_id=uuid.UUID(user_id),
            consent_type="mood_suggestions",
            granted=True,
            version="1.0",
        ))
        await session.commit()

    # 3. Create Session and a Suggestion directly in DB
    async with TestAsyncSessionLocal() as session:
        det_session = DetectionSession(
            user_id=uuid.UUID(user_id),
            platform="web",
            status="active",
        )
        session.add(det_session)
        await session.flush()

        sug = Suggestion(
            session_id=det_session.id,
            user_id=uuid.UUID(user_id),
            rule_id="happy_music_boost",
            category="music",
            expression_trigger="happy",
            confidence_at_trigger=0.88,
            requires_confirmation=True,
            expires_at=datetime.now(tz=timezone.utc) + timedelta(seconds=60),
            status="pending",
        )
        session.add(sug)
        await session.commit()
        sug_id = str(sug.id)

    # 4. Respond to suggestion (accepted)
    respond_res = await client.post(
        f"/api/v1/suggestions/{sug_id}/respond",
        json={"decision": "accepted"},
        headers=headers,
    )
    assert respond_res.status_code == 200
    assert respond_res.json()["decision"] == "accepted"

    # Verify duplicate respond fails with 409
    dup_res = await client.post(
        f"/api/v1/suggestions/{sug_id}/respond",
        json={"decision": "dismissed"},
        headers=headers,
    )
    assert dup_res.status_code == 409

    # 5. Authorize action token
    auth_res = await client.post(
        "/api/v1/suggestions/authorize-action",
        json={
            "action_id": f"act_{uuid.uuid4().hex[:8]}",
            "action_type": "open_music",
            "category": "music",
            "session_id": str(det_session.id),
        },
        headers=headers,
    )
    assert auth_res.status_code == 200
    action_token = auth_res.json()["action_token"]
    assert action_token.startswith("act_tok_")

    # 6. Reject execution when not confirmed by user
    unconfirmed_res = await client.post(
        "/api/v1/suggestions/execute-action",
        json={
            "action_id": "act_test",
            "action_type": "open_music",
            "action_token": action_token,
            "confirmed_by_user": False,
        },
        headers=headers,
    )
    assert unconfirmed_res.status_code == 400

    # 7. Execute action successfully with user confirmation
    exec_res = await client.post(
        "/api/v1/suggestions/execute-action",
        json={
            "action_id": "act_test",
            "action_type": "open_music",
            "action_token": action_token,
            "confirmed_by_user": True,
        },
        headers=headers,
    )
    assert exec_res.status_code == 200
    assert exec_res.json()["success"] is True
    assert exec_res.json()["result_code"] == "ACTION_COMPLETED"
