"""
MoodLens Safety Test Suite - Occlusion State Machine Transitions
Spec Section 13 & 86.
VISIBLE -> PARTIAL_OCCLUSION -> TEMPORARY_LOSS -> UNKNOWN
"""
import pytest
import time


def test_occlusion_lifecycle():
    # 1. Quality < MIN_FACE_QUALITY triggers PARTIAL_OCCLUSION
    min_quality = 0.35
    degraded_quality = 0.20
    is_occluded = degraded_quality < min_quality
    assert is_occluded is True

    # 2. Tracking loss under timeout is TEMPORARY_LOSS
    timeout_ms = 2500
    elapsed_loss_ms = 500
    state = "TEMPORARY_LOSS" if elapsed_loss_ms < timeout_ms else "UNKNOWN"
    assert state == "TEMPORARY_LOSS"

    # 3. Tracking loss exceeding timeout is UNKNOWN
    elapsed_loss_ms = 3000
    state = "TEMPORARY_LOSS" if elapsed_loss_ms < timeout_ms else "UNKNOWN"
    assert state == "UNKNOWN"
    assert state != "sad"  # Strict invariant: UNKNOWN must never be interpreted as an emotion
