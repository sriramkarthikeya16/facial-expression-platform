"""
Security Header Enforcement Tests (Spec Sections 59, 63).
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_security_headers_enforced(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200

    headers = response.headers
    assert "x-content-type-options" in headers
    assert headers["x-content-type-options"] == "nosniff"

    assert "x-frame-options" in headers
    assert headers["x-frame-options"] == "DENY"

    assert "strict-transport-security" in headers
    assert "max-age=" in headers["strict-transport-security"]

    assert "content-security-policy" in headers
    assert "default-src" in headers["content-security-policy"]
