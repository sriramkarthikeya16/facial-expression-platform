"""
MoodLens Integration Tests - 7 Consents and GDPR Data Export & Erasure
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_consent_and_gdpr_endpoints(client: AsyncClient):
    # 1. Register & Login
    email = "gdpr_user@moodlens.app"
    password = "SecurePassword123"
    reg_res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "username": "gdpruser"},
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Grant and Revoke 7 Granular Consents
    consents_to_test = [
        "camera_access",
        "expression_processing",
        "mood_suggestions",
        "music_integration",
        "food_suggestions",
        "trusted_contacts",
        "cloud_sync",
    ]

    for c in consents_to_test:
        res = await client.post(
            "/api/v1/consents",
            json={"consent_type": c, "granted": True},
            headers=headers,
        )
        assert res.status_code in (200, 201)

    # Verify All Consents
    all_res = await client.get("/api/v1/consents", headers=headers)
    assert all_res.status_code == 200
    granted_types = [item["consent_type"] for item in all_res.json()["consents"] if item["granted"]]
    for c in consents_to_test:
        assert c in granted_types

    # 3. GDPR Article 20 Export
    export_res = await client.get("/api/v1/users/me/export", headers=headers)
    assert export_res.status_code == 200
    export_data = export_res.json()
    assert "user_id_hash" in export_data
    assert export_data["profile"]["email"] == email
    assert len(export_data["consents"]) >= 7

    # 4. GDPR Article 17 Right to Erasure
    erase_res = await client.delete("/api/v1/users/me/data", headers=headers)
    assert erase_res.status_code == 200
    assert "permanently erased" in erase_res.json()["message"]
