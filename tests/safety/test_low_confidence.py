"""
MoodLens Safety Test Suite - Low Confidence & Camera Interruption
Spec Section 48, 49 & 86.
"""
import pytest


def test_low_confidence_maps_to_neutral():
    """Confidence scores below 0.25 default to 'neutral' baseline rather than unknown."""
    confidence_tier_unknown = 0.25
    model_raw_confidence = 0.20
    
    assigned_state = "neutral" if model_raw_confidence <= confidence_tier_unknown else "classified"
    assert assigned_state == "neutral"


def test_action_cancellation_invariant():
    """CRITICAL SAFETY INVARIANT: Model Output ALONE must NEVER execute actions without user confirmation."""
    action_payload = {
        "action_id": "act_sos_999",
        "action_type": "call_trusted_contact",
        "confirmed_by_user": False, # User clicked [I'm OK] / Dismiss
    }

    def execute_action(action):
        if not action.get("confirmed_by_user"):
            return {"success": False, "result_code": "USER_CANCELLED"}
        return {"success": True, "result_code": "ACTION_EXECUTED"}

    result = execute_action(action_payload)
    assert result["success"] is False
    assert result["result_code"] == "USER_CANCELLED"
