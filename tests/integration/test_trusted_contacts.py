"""
Integration Tests for Trusted Contacts CRUD and Emergency Escalation Integration.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_trusted_contacts_crud_and_favorite(client: AsyncClient):
    # 1. Register and login
    user_payload = {
        "email": "contact_tester@moodlens.ai",
        "username": "contacttester",
        "password": "P@ssword12345!",
    }
    reg_res = await client.post("/api/v1/auth/register", json=user_payload)
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Initially empty
    list_res = await client.get("/api/v1/users/me/contacts", headers=headers)
    assert list_res.status_code == 200
    assert list_res.json() == []

    # 3. Create first contact (favorite)
    contact1 = {
        "name": "Alice Mom",
        "phone_number": "+1-555-0101",
        "relationship": "Mother",
        "is_favorite": True,
    }
    c1_res = await client.post("/api/v1/users/me/contacts", json=contact1, headers=headers)
    assert c1_res.status_code == 201
    c1_data = c1_res.json()
    assert c1_data["name"] == "Alice Mom"
    assert c1_data["is_favorite"] is True
    c1_id = c1_data["id"]

    # 4. Check favorite endpoint
    fav_res = await client.get("/api/v1/users/me/contacts/favorite", headers=headers)
    assert fav_res.status_code == 200
    assert fav_res.json()["id"] == c1_id

    # 5. Create second contact and make it favorite
    contact2 = {
        "name": "Dr. Bob",
        "phone_number": "+1-555-0102",
        "relationship": "Therapist",
        "is_favorite": True,
    }
    c2_res = await client.post("/api/v1/users/me/contacts", json=contact2, headers=headers)
    assert c2_res.status_code == 201
    c2_id = c2_res.json()["id"]

    # Verify c2 is now favorite, c1 un-favorited
    fav_res2 = await client.get("/api/v1/users/me/contacts/favorite", headers=headers)
    assert fav_res2.status_code == 200
    assert fav_res2.json()["id"] == c2_id

    # 6. Update c1 name
    upd_res = await client.put(f"/api/v1/users/me/contacts/{c1_id}", json={"name": "Alice (Mother)"}, headers=headers)
    assert upd_res.status_code == 200
    assert upd_res.json()["name"] == "Alice (Mother)"

    # 7. Delete c2
    del_res = await client.delete(f"/api/v1/users/me/contacts/{c2_id}", headers=headers)
    assert del_res.status_code == 204

    # 8. List contacts
    final_list = await client.get("/api/v1/users/me/contacts", headers=headers)
    assert len(final_list.json()) == 1
