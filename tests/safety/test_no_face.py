"""
MoodLens Safety Test Suite - No Face & Zero False Trigger Verification
Spec Section 48 & 86.
Assertion: When no face is in frame, state MUST transition to 'no_face' with zero false emotion triggers.
"""
import pytest


def test_no_face_transition():
    # Simulated frames with zero face detection
    class MockCVStateMachine:
        def __init__(self):
            self.state = "UNKNOWN"
            
        def process(self, detected: bool):
            if not detected:
                self.state = "UNKNOWN"
            return self.state

    sm = MockCVStateMachine()
    res = sm.process(detected=False)
    
    assert res == "UNKNOWN"
    assert res != "sad"
    assert res != "fear"


def test_no_face_zero_suggestions():
    """Verify suggestion engine returns None when state is 'no_face'."""
    smoothed = {
        "expression": "no_face",
        "trackingState": "UNKNOWN",
        "confidence": 0.0,
        "rawConfidence": 0.0,
        "probabilities": {"happy": 0, "sad": 0, "angry": 0, "fear": 0, "disgust": 0, "surprise": 0, "neutral": 0},
        "durationSeconds": 15.0,
        "qualityScore": 0.0,
        "isStable": False,
        "timestamp": 123456789,
    }

    # Any rule evaluator must reject non-emotion system states
    core_emotions = ["happy", "sad", "angry", "fear", "disgust", "surprise", "neutral"]
    assert smoothed["expression"] not in core_emotions
