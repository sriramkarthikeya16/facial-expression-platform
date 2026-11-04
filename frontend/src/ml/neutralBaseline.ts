/**
 * MoodLens — Neutral Baseline Calibration
 *
 * Captures the user's resting face during the first ~2 seconds after camera
 * activation and computes an average ExpressionVector as the session baseline.
 *
 * Every subsequent frame is emitted as an ExpressionFeatureState containing:
 *   • absolute  – the raw expression vector (20 coefficients)
 *   • delta     – element-wise (current − baseline), clamped
 *   • baseline  – the stored average (null until calibrated)
 *
 * The fusion classifier receives all 40 features (20 absolute + 20 delta).
 *
 * Privacy-first: the baseline lives in memory only and is discarded when the
 * session ends or the camera restarts.
 */

import {
  ExpressionVector,
  ExpressionFeatureState,
  CalibrationState,
  EXPRESSION_VECTOR_KEYS,
} from '../types/expression';

import { THRESHOLDS } from '../../../shared/configuration/thresholds';

// ── Head-pose keys use the full -1…1 range; all others are 0…1 ──
const HEAD_POSE_KEYS: ReadonlySet<keyof ExpressionVector> = new Set([
  'headPitch',
  'headYaw',
  'headRoll',
]);

/**
 * Build an ExpressionVector with every coefficient set to zero.
 */
function createZeroVector(): ExpressionVector {
  const vec = {} as ExpressionVector;
  for (const key of EXPRESSION_VECTOR_KEYS) {
    vec[key] = 0;
  }
  return vec;
}

/**
 * Element-wise average of an array of ExpressionVectors.
 */
function averageVectors(frames: ExpressionVector[]): ExpressionVector {
  const count = frames.length;
  if (count === 0) return createZeroVector();

  const sum = createZeroVector();
  for (const frame of frames) {
    for (const key of EXPRESSION_VECTOR_KEYS) {
      sum[key] += frame[key];
    }
  }
  for (const key of EXPRESSION_VECTOR_KEYS) {
    sum[key] /= count;
  }
  return sum;
}

/**
 * Clamp `value` between `min` and `max`.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * NeutralBaseline manages per-session neutral-face calibration.
 *
 * Usage:
 * ```
 *   const baseline = new NeutralBaseline();
 *   baseline.startCalibration();
 *
 *   // In the per-frame loop:
 *   if (baseline.getState() === 'calibrating') {
 *     baseline.addCalibrationFrame(currentVector);
 *   }
 *   const features = baseline.computeFeatureState(currentVector);
 *   // features.absolute  → 20 raw coefficients
 *   // features.delta     → 20 baseline-relative deltas
 * ```
 */
export class NeutralBaseline {
  private baseline: ExpressionVector | null = null;
  private calibrationFrames: ExpressionVector[] = [];
  private state: CalibrationState = 'idle';
  private calibrationStartTime: number = 0;

  // ────────────────────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Begin collecting neutral-face calibration frames.
   * Call once when the camera first activates (or on restart).
   */
  startCalibration(): void {
    this.calibrationFrames = [];
    this.baseline = null;
    this.state = 'calibrating';
    this.calibrationStartTime = performance.now();
  }

  /**
   * Feed a single frame's expression vector during calibration.
   *
   * @returns `true` when calibration has completed (baseline is ready),
   *          `false` while still collecting frames.
   */
  addCalibrationFrame(vector: ExpressionVector): boolean {
    if (this.state !== 'calibrating') return false;

    // Respect the max-frames cap to avoid over-averaging
    if (this.calibrationFrames.length < THRESHOLDS.BASELINE_MAX_FRAMES) {
      this.calibrationFrames.push(vector);
    }

    const elapsedMs = performance.now() - this.calibrationStartTime;

    // ── Normal completion: enough frames AND enough time ──
    if (
      this.calibrationFrames.length >= THRESHOLDS.BASELINE_MIN_FRAMES &&
      elapsedMs >= THRESHOLDS.BASELINE_CALIBRATION_DURATION_MS
    ) {
      this.finaliseBaseline();
      return true;
    }

    // ── Timeout path: 2× the nominal duration ──
    const timeoutMs = THRESHOLDS.BASELINE_CALIBRATION_DURATION_MS * 2;
    if (elapsedMs > timeoutMs) {
      if (this.calibrationFrames.length >= 5) {
        // Enough frames to form a rough baseline
        this.finaliseBaseline();
        return true;
      }
      // Too few frames — calibration failed
      this.state = 'failed';
      return false;
    }

    return false;
  }

  /**
   * Current calibration lifecycle state.
   */
  getState(): CalibrationState {
    return this.state;
  }

  /**
   * Calibration progress in the range [0, 1].
   *
   * Progress is the *minimum* of time-progress and frame-progress so that
   * both conditions must be met before reaching 1.0.
   */
  getProgress(): number {
    if (this.state === 'idle') return 0;
    if (this.state === 'calibrated') return 1;
    if (this.state === 'failed') return 0;

    const elapsedMs = performance.now() - this.calibrationStartTime;
    const timeProgress = clamp(
      elapsedMs / THRESHOLDS.BASELINE_CALIBRATION_DURATION_MS,
      0,
      1,
    );
    const frameProgress = clamp(
      this.calibrationFrames.length / THRESHOLDS.BASELINE_MIN_FRAMES,
      0,
      1,
    );

    return Math.min(timeProgress, frameProgress);
  }

  /**
   * Produce the full feature state for the current frame.
   *
   * If the baseline has not yet been established the delta will be a zero
   * vector so that downstream consumers always receive a well-formed input.
   */
  computeFeatureState(current: ExpressionVector): ExpressionFeatureState {
    const absolute = { ...current };
    const delta = this.computeDelta(current);

    return {
      absolute,
      delta,
      baseline: this.baseline ? { ...this.baseline } : null,
    };
  }

  /**
   * Return the stored baseline, or `null` if calibration has not completed.
   */
  getBaseline(): ExpressionVector | null {
    return this.baseline ? { ...this.baseline } : null;
  }

  /**
   * Discard the current baseline and return to the idle state.
   * Call on camera restart or when the user explicitly requests recalibration.
   */
  reset(): void {
    this.baseline = null;
    this.calibrationFrames = [];
    this.state = 'idle';
    this.calibrationStartTime = 0;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Average all collected frames and commit the baseline.
   */
  private finaliseBaseline(): void {
    this.baseline = averageVectors(this.calibrationFrames);
    this.state = 'calibrated';
    // Release the frame buffer — we no longer need it
    this.calibrationFrames = [];
  }

  /**
   * Element-wise `current − baseline`, clamped per-key.
   *
   * Head-pose keys (pitch / yaw / roll) are clamped to [-1, 1].
   * All other blend-shape keys are clamped to [-1, 1] as well — the raw
   * coefficients are 0–1 but subtracting the baseline naturally produces
   * values in approximately [-1, 1].
   */
  private computeDelta(current: ExpressionVector): ExpressionVector {
    if (!this.baseline) return createZeroVector();

    const delta = {} as ExpressionVector;
    for (const key of EXPRESSION_VECTOR_KEYS) {
      const raw = current[key] - this.baseline[key];
      // Both pose and blend-shape deltas live in [-1, 1]
      delta[key] = clamp(raw, -1, 1);
    }
    return delta;
  }
}
