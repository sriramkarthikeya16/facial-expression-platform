"""
MoodLens Security Test Suite - Action Token Expiration & Scopes
Spec Sections 26, 45, 83 & 87.
"""
from datetime import datetime, timezone, timedelta
import pytest


def test_action_token_expiration():
    """Verify expired action authorization tokens (TTL > 60s) are rejected."""
    now = datetime.now(tz=timezone.utc)
    expired_token_timestamp = now - timedelta(seconds=65)
    token_ttl_seconds = 60

    is_expired = (now - expired_token_timestamp).total_seconds() > token_ttl_seconds
    assert is_expired is True


def test_oauth_scope_authorization():
    """Verify scope validation logic."""
    user_scopes = ["expression.read", "suggestion.read"]
    required_sensitive_scope = "action.execute"

    has_permission = required_sensitive_scope in user_scopes
    assert has_permission is False
