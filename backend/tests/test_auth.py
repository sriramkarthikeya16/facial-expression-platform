"""
MoodLens Backend Tests - Authentication Endpoints
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    """User can register with valid credentials."""
    response = await client.post("/api/v1/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "SecurePass123",
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["role"] == "user"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Registration with duplicate email returns 409."""
    payload = {
        "username": "user2",
        "email": "duplicate@example.com",
        "password": "SecurePass123",
    }
    await client.post("/api/v1/auth/register", json=payload)
    # Same email, different username
    payload["username"] = "user3"
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    """Registration with weak password returns 422."""
    response = await client.post("/api/v1/auth/register", json={
        "username": "weakuser",
        "email": "weak@example.com",
        "password": "weak",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """User can log in with valid credentials."""
    # Register first
    await client.post("/api/v1/auth/register", json={
        "username": "logintest",
        "email": "logintest@example.com",
        "password": "SecurePass123",
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "logintest@example.com",
        "password": "SecurePass123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Login with wrong password returns 401."""
    await client.post("/api/v1/auth/register", json={
        "username": "wrongpass",
        "email": "wrongpass@example.com",
        "password": "SecurePass123",
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "wrongpass@example.com",
        "password": "WrongPassword999",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    """Accessing protected endpoint without token returns 403."""
    response = await client.get("/api/v1/users/me")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient):
    """Authenticated user can access /users/me."""
    # Register and get token
    reg = await client.post("/api/v1/auth/register", json={
        "username": "meuser",
        "email": "meuser@example.com",
        "password": "SecurePass123",
    })
    token = reg.json()["access_token"]

    response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "meuser@example.com"


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Health check endpoint returns healthy status."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
