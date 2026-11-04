"""
MoodLens Integration Tests - Model Registry Lifecycle (Register, Activate, Rollback)
"""
import pytest
from httpx import AsyncClient
import uuid


@pytest.mark.asyncio
async def test_model_registry_lifecycle(client: AsyncClient):
    # 1. Register admin user
    admin_reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "model_admin@moodlens.app", "password": "AdminPassword123!", "username": "model_admin"},
    )
    assert admin_reg.status_code == 201
    admin_id = admin_reg.json()["user"]["id"]
    admin_token = admin_reg.json()["access_token"]

    # Promote to admin
    from conftest import TestAsyncSessionLocal
    from app.models.user import User
    from sqlalchemy import update

    async with TestAsyncSessionLocal() as session:
        await session.execute(
            update(User).where(User.id == uuid.UUID(admin_id)).values(role="admin")
        )
        await session.commit()

    headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Register Model V1 (INT8)
    v1_payload = {
        "model_id": "moodlens_test_v1_int8",
        "version": "1.0.0",
        "architecture": "MobileNetV3-Large",
        "quantization": "int8",
        "format": "onnx",
        "file_name": "moodlens_test_v1_int8.onnx",
        "sha256_hash": "a" * 64,
        "size_bytes": 4500000,
        "dataset_version": "v1.0-balanced",
        "accuracy": 0.814,
        "macro_f1": 0.762,
        "balanced_accuracy": 0.789,
        "expected_calibration_error": 0.042,
        "is_active": True,
        "benchmarks_json": {"latency_ms": {"p50": 38.0, "p95": 74.0, "p99": 112.0}},
    }
    reg1 = await client.post("/api/v1/models", json=v1_payload, headers=headers)
    assert reg1.status_code == 201
    assert reg1.json()["model_id"] == "moodlens_test_v1_int8"
    assert reg1.json()["is_active"] is True

    # 3. Check active model endpoint
    active_res = await client.get("/api/v1/models/active")
    assert active_res.status_code == 200
    assert active_res.json()["model_id"] == "moodlens_test_v1_int8"

    # 4. Register Model V2 (INT8 candidate)
    v2_payload = {
        "model_id": "moodlens_test_v2_int8",
        "version": "2.0.0",
        "architecture": "MobileNetV3-Large",
        "quantization": "int8",
        "format": "onnx",
        "file_name": "moodlens_test_v2_int8.onnx",
        "sha256_hash": "b" * 64,
        "size_bytes": 4600000,
        "dataset_version": "v2.0-balanced",
        "accuracy": 0.845,
        "macro_f1": 0.812,
        "balanced_accuracy": 0.825,
        "expected_calibration_error": 0.038,
        "is_active": False,
        "benchmarks_json": {"latency_ms": {"p50": 35.0, "p95": 68.0, "p99": 105.0}},
    }
    reg2 = await client.post("/api/v1/models", json=v2_payload, headers=headers)
    assert reg2.status_code == 201
    assert reg2.json()["is_active"] is False

    # 5. List models
    list_res = await client.get("/api/v1/models")
    assert list_res.status_code == 200
    models_data = list_res.json()
    assert models_data["total"] >= 2

    # 6. Activate Model V2
    act_res = await client.post("/api/v1/models/moodlens_test_v2_int8/activate", headers=headers)
    assert act_res.status_code == 200
    assert act_res.json()["is_active"] is True

    # Verify active model is now V2
    active_check = await client.get("/api/v1/models/active")
    assert active_check.status_code == 200
    assert active_check.json()["model_id"] == "moodlens_test_v2_int8"

    # 7. Rollback to V1
    rb_res = await client.post("/api/v1/models/moodlens_test_v1_int8/rollback", headers=headers)
    assert rb_res.status_code == 200
    assert rb_res.json()["is_active"] is True

    # Verify active model rolled back to V1
    active_after_rb = await client.get("/api/v1/models/active")
    assert active_after_rb.status_code == 200
    assert active_after_rb.json()["model_id"] == "moodlens_test_v1_int8"
