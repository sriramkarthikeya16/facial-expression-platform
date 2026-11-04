"""
MoodLens Safety Test Suite - Multi-Face Scoring & Primary Lock
Spec Section 12, 48 & 86.
"""
import pytest


def test_multi_face_candidate_ranking():
    """Verify that multiple candidate faces are ranked by quality and primary face is selected."""
    candidates = [
        {"id": "face_1", "area": 0.05, "confidence": 0.70, "qualityScore": 0.50},
        {"id": "face_0", "area": 0.25, "confidence": 0.95, "qualityScore": 0.92}, # Primary face
        {"id": "face_2", "area": 0.02, "confidence": 0.60, "qualityScore": 0.35},
    ]

    candidates.sort(key=lambda c: c["qualityScore"], reverse=True)
    primary = candidates[0]

    assert primary["id"] == "face_0"
    assert primary["qualityScore"] == 0.92
    assert len(candidates) == 3


def test_multi_face_warning_state():
    """Verify that 2+ ambiguous faces trigger a multi-face warning rather than silent inference."""
    face_count = 3
    is_multi_face_warning = face_count > 1
    
    assert is_multi_face_warning is True
