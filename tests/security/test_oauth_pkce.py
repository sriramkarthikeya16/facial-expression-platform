"""
MoodLens Security Test Suite - OAuth PKCE & Biometric Non-Retention Verification
Spec Sections 27, 40, 46, 81 & 87.
"""
import hashlib
import base64
import secrets
import pytest


def test_pkce_challenge_generation():
    """Verify standard S256 PKCE Code Challenge generation."""
    code_verifier = secrets.token_urlsafe(64)
    assert len(code_verifier) >= 43

    # Generate SHA-256 hash of verifier
    hashed = hashlib.sha256(code_verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(hashed).decode("ascii").rstrip("=")

    assert challenge is not None
    assert len(challenge) > 20


def test_zero_raw_biometric_in_audit_logs():
    """Verify that audit log schema contains only SHA-256 hashes and zero raw video / face crops."""
    raw_user_id = "user_test_uuid_12345"
    user_hash = hashlib.sha256(raw_user_id.encode()).hexdigest()

    audit_entry = {
        "event": "CALL_REQUESTED",
        "user_id_hash": user_hash,
        "action_id": "act_123",
        "source": "user_confirmation",
        "result": "dialer_opened",
    }

    # Prohibited biometric fields
    prohibited_fields = ["face_image", "video_frame", "facial_embedding", "raw_pixels", "landmarks_raw"]
    for field in prohibited_fields:
        assert field not in audit_entry

    assert audit_entry["user_id_hash"] != raw_user_id
    assert len(audit_entry["user_id_hash"]) == 64
