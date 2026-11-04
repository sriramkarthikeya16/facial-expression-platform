"""
MoodLens Integration Tests - Session Lifecycle, Real-Time State, and Deletion
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_session_lifecycle_and_state(client: AsyncClient):
    # 1. Register & Login User
    email = "sess_user@moodlens.app"
    password = "SecurePassword123"
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "username": "sessuser"},
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Session
    create_res = await client.post(
        "/api/v1/sessions",
        json={"platform": "web", "model_version": "1.2.0"},
        headers=headers,
    )
    assert create_res.status_code == 201
    session_id = create_res.json()["id"]

    # 3. Query initial state
    state_res = await client.get(f"/api/v1/sessions/{session_id}/state", headers=headers)
    assert state_res.status_code == 200
    state_data = state_res.json()
    assert state_data["session_id"] == session_id
    assert state_data["status"] == "active"

    # 4. Add aggregated batch events
    events_payload = {
        "events": [
            {
                "expression": "happy",
                "confidence": 0.88,
                "duration_seconds": 4.5,
                "quality_score": 0.95,
                "tracking_confidence": 0.92,
                "model_version": "1.2.0",
            }
        ]
    }
    batch_res = await client.post(
        f"/api/v1/sessions/{session_id}/events",
        json=events_payload,
        headers=headers,
    )
    assert batch_res.status_code == 201

    # 5. Query state after events
    updated_state = await client.get(f"/api/v1/sessions/{session_id}/state", headers=headers)
    assert updated_state.status_code == 200
    updated_data = updated_state.json()
    assert updated_data["expression"] == "happy"
    assert updated_data["confidence"] == 0.88
    assert updated_data["tracking"] is True

    # 6. End Session
    end_res = await client.patch(
        f"/api/v1/sessions/{session_id}/end",
        json={"total_duration_seconds": 45},
        headers=headers,
    )
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "completed"

    # 7. Delete Session
    del_res = await client.delete(f"/api/v1/sessions/{session_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify session is deleted (404)
    get_del = await client.get(f"/api/v1/sessions/{session_id}", headers=headers)
    assert get_del.status_code == 404
