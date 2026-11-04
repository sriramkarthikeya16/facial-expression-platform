/**
 * MoodLens - Formal Computer Vision Tracking State Machine
 * Manages tracking lifecycle: VISIBLE -> PARTIAL_OCCLUSION -> TEMPORARY_LOSS -> REDETECTION -> UNKNOWN
 * Guarantees that camera dropout or occlusion never falsely triggers an emotion.
 */
import { TrackingState } from '../../../shared/schemas/expression';
import { THRESHOLDS } from '../../../shared/configuration/thresholds';

export interface CVStateInput {
  isFaceDetected: boolean;
  qualityScore: number;
  trackingConfidence: number;
  faceCount: number;
}

export interface CVStateOutput {
  trackingState: TrackingState;
  isFaceUsableForInference: boolean;
  stateDurationMs: number;
  isMultiFaceWarning: boolean;
  qualityScore: number;
}

export class CVStateMachine {
  private currentState: TrackingState = 'UNKNOWN';
  private stateStartTime: number = Date.now();
  private lastVisibleTime: number = 0; // 0 = never seen, triggers UNKNOWN immediately on loss
  private consecutiveLossFrames = 0;
  private consecutiveDetectedFrames = 0;

  public transition(input: CVStateInput): CVStateOutput {
    const now = Date.now();
    const { isFaceDetected, qualityScore, trackingConfidence, faceCount } = input;
    const isMultiFaceWarning = faceCount > 1;

    let targetState: TrackingState = this.currentState;

    if (isFaceDetected) {
      this.consecutiveLossFrames = 0;
      this.consecutiveDetectedFrames++;

      if (qualityScore >= THRESHOLDS.MIN_FACE_QUALITY && trackingConfidence >= THRESHOLDS.MIN_TRACKING_CONFIDENCE) {
        if (this.currentState === 'TEMPORARY_LOSS' || this.currentState === 'UNKNOWN') {
          // Need 2 consecutive good frames to re-enter (debounce flicker)
          if (this.consecutiveDetectedFrames >= 2) {
            targetState = 'REDETECTION';
          }
          // else stay in current state (UNKNOWN/TEMPORARY_LOSS) until stabilized
        } else {
          targetState = 'VISIBLE';
        }
        this.lastVisibleTime = now;
      } else {
        // Face present but obstructed / poor lighting / hand over face
        targetState = 'PARTIAL_OCCLUSION';
      }
    } else {
      // Face not detected in current frame
      this.consecutiveDetectedFrames = 0;
      this.consecutiveLossFrames++;

      if (this.lastVisibleTime === 0) {
        // Never seen a face yet — stay UNKNOWN until first detection
        targetState = 'UNKNOWN';
      } else {
        const elapsedSinceVisible = now - this.lastVisibleTime;
        if (elapsedSinceVisible < THRESHOLDS.OCCLUSION_TIMEOUT_MS) {
          targetState = 'TEMPORARY_LOSS';
        } else {
          targetState = 'UNKNOWN';
        }
      }
    }

    // Handle REDETECTION stabilization — promote to VISIBLE after 2 consecutive good frames
    if (this.currentState === 'REDETECTION' && targetState === 'REDETECTION' && this.consecutiveDetectedFrames >= 2) {
      targetState = 'VISIBLE';
    }

    // Record state change timestamp
    if (targetState !== this.currentState) {
      this.currentState = targetState;
      this.stateStartTime = now;
    }

    const stateDurationMs = now - this.stateStartTime;
    // Both VISIBLE and REDETECTION allow inference — REDETECTION is valid as face was just found
    const isFaceUsableForInference = (
      this.currentState === 'VISIBLE' || this.currentState === 'REDETECTION'
    ) && !isMultiFaceWarning;

    return {
      trackingState: this.currentState,
      isFaceUsableForInference,
      stateDurationMs,
      isMultiFaceWarning,
      qualityScore,
    };
  }

  public reset(): void {
    this.currentState = 'UNKNOWN';
    this.stateStartTime = Date.now();
    this.lastVisibleTime = 0; // Reset to 0 — no face ever seen
    this.consecutiveLossFrames = 0;
    this.consecutiveDetectedFrames = 0;
  }

  public getCurrentState(): TrackingState {
    return this.currentState;
  }
}
