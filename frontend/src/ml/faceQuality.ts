/**
 * MoodLens - Face Quality Assessor & Dynamic Fusion Weight Calculator
 *
 * Evaluates per-frame face quality from multiple signals (landmark confidence,
 * face size, brightness, blur, head pose, occlusion) and computes dynamic
 * fusion weights that balance CNN vs. landmark branches.
 *
 * Integration points:
 *   - CVStateMachine provides trackingConfidence & tracking state
 *   - FusionClassifier consumes { cnnWeight, landmarkWeight } to blend branches
 *   - ExpressionVector provides head pose (pitch, yaw, roll)
 *
 * All quality sub-scores are in [0, 1] where 1 = best quality.
 * Fusion weights always sum to 1.0 and are clamped to [FUSION_WEIGHT_MIN, FUSION_WEIGHT_MAX].
 */
import { FaceQualityMetrics } from '../types/expression';
import { THRESHOLDS } from '../../../shared/configuration/thresholds';

// ── Internal Constants ──────────────────────────────────────────────────────

/** Face size scoring — ideal range is 10-50% of frame area */
const FACE_SIZE_IDEAL_MIN = 0.10;
const FACE_SIZE_IDEAL_MAX = 0.50;
const FACE_SIZE_DROP_LOW = 0.04;   // Below this, score → 0
const FACE_SIZE_DROP_HIGH = 0.60;  // Above this, score → 0

/** Brightness scoring — ideal range [0.15, 0.85] normalized luminance */
const BRIGHTNESS_IDEAL_MIN = 0.15;
const BRIGHTNESS_IDEAL_MAX = 0.85;
const BRIGHTNESS_DROP_LOW = 0.03;  // Near-black
const BRIGHTNESS_DROP_HIGH = 0.98; // Fully blown out

/** Blur scoring — Laplacian variance normalization reference */
const BLUR_LAPLACIAN_NORMALIZATION = 800; // Variance of a sharp face crop
const BLUR_MIN_VARIANCE = 10;             // Below this → maximally blurry

/** Head pose scoring — angle limits (radians) for quality drop */
const POSE_YAW_IDEAL = 0.15;     // ±8.6° — effectively frontal
const POSE_PITCH_IDEAL = 0.12;   // ±6.9°
const POSE_ROLL_IDEAL = 0.10;    // ±5.7°
const POSE_YAW_MAX = 1.05;       // ±60° — profile, unusable
const POSE_PITCH_MAX = 0.85;     // ±49°
const POSE_ROLL_MAX = 0.80;      // ±46°

/** Occlusion scoring — landmark Z-depth confidence threshold */
const LANDMARK_Z_OCCLUSION_THRESHOLD = -0.15; // Deeper than this suggests occlusion
const LANDMARK_OCCLUSION_SAMPLE_COUNT = 80;    // Number of key landmarks to sample

/** Overall quality sub-score weights */
const QUALITY_WEIGHTS = {
  landmarkConfidence: 0.20,
  faceSize: 0.10,
  blur: 0.15,
  brightness: 0.10,
  headPose: 0.15,
  occlusion: 0.15,
  trackingConfidence: 0.15,
} as const;

/** Key landmark indices for occlusion sampling (evenly distributed across face regions) */
const OCCLUSION_LANDMARK_INDICES: readonly number[] = [
  // Face contour (jawline)
  10, 21, 54, 67, 103, 109, 132, 152, 162, 172, 176, 234, 264, 284, 297, 332, 338, 361, 389, 397,
  // Left eye region
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
  // Right eye region
  362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398,
  // Nose
  1, 2, 4, 5, 6, 19, 94, 141, 168, 195, 197,
  // Mouth region
  0, 11, 12, 13, 14, 15, 16, 17, 37, 39, 40, 61, 78, 80, 81, 82, 87, 88, 95, 146, 178, 181, 185, 191,
  267, 269, 270, 291, 308, 310, 311, 312, 317, 318, 324, 375, 402, 405, 409, 415,
];

export class FaceQualityAssessor {
  private grayBuffer = new Float32Array(64 * 64);
  /**
   * Assess face quality from multiple signals.
   * All quality sub-scores are computed and combined into an overall quality.
   *
   * @param landmarks      MediaPipe 478 3D landmarks (null if detection failed)
   * @param landmarkConfidence  MediaPipe detection confidence (0–1)
   * @param headPose       Head orientation in radians from ExpressionVector
   * @param faceBox        Bounding box in normalized [0–1] coordinates (null if no face)
   * @param frameWidth     Camera frame width in pixels
   * @param frameHeight    Camera frame height in pixels
   * @param trackingConfidence  CV state machine tracking confidence (0–1)
   * @param faceCropPixels Raw RGBA pixel data of the face crop (null if unavailable)
   * @param cropSize       Width/height of the square face crop in pixels
   */
  assess(
    landmarks: Array<{ x: number; y: number; z: number }> | null,
    landmarkConfidence: number,
    headPose: { pitch: number; yaw: number; roll: number },
    faceBox: { x: number; y: number; width: number; height: number } | null,
    frameWidth: number,
    frameHeight: number,
    trackingConfidence: number,
    faceCropPixels: Uint8ClampedArray | null,
    cropSize: number
  ): FaceQualityMetrics {
    const faceSize = this.computeFaceSize(faceBox, frameWidth, frameHeight);
    const brightness = this.computeBrightness(faceCropPixels, cropSize);
    const blur = this.computeBlur(faceCropPixels, cropSize);
    const absYaw = Math.abs(headPose.yaw);
    const absPitch = Math.abs(headPose.pitch);
    const absRoll = Math.abs(headPose.roll);
    const occlusion = this.estimateOcclusion(landmarks, landmarkConfidence);

    // Convert raw values to quality sub-scores (all in [0, 1] where 1 = best)
    const faceSizeScore = this.scoreFaceSize(faceSize);
    const brightnessScore = this.scoreBrightness(brightness);
    const blurScore = 1.0 - blur; // blur is 0=sharp, 1=blurry; invert for quality
    const headPoseScore = this.scoreHeadPose(absYaw, absPitch, absRoll);
    const occlusionScore = 1.0 - occlusion; // occlusion is 0=none, 1=full; invert
    const clampedLandmarkConf = clamp(landmarkConfidence, 0, 1);
    const clampedTrackingConf = clamp(trackingConfidence, 0, 1);

    const overallQuality =
      QUALITY_WEIGHTS.landmarkConfidence * clampedLandmarkConf +
      QUALITY_WEIGHTS.faceSize * faceSizeScore +
      QUALITY_WEIGHTS.blur * blurScore +
      QUALITY_WEIGHTS.brightness * brightnessScore +
      QUALITY_WEIGHTS.headPose * headPoseScore +
      QUALITY_WEIGHTS.occlusion * occlusionScore +
      QUALITY_WEIGHTS.trackingConfidence * clampedTrackingConf;

    return {
      landmarkConfidence: clampedLandmarkConf,
      faceSize,
      blur,
      brightness,
      absYaw,
      absPitch,
      absRoll,
      occlusion,
      trackingConfidence: clampedTrackingConf,
      overallQuality: clamp(overallQuality, 0, 1),
    };
  }

  /**
   * Compute dynamic fusion weights based on quality metrics.
   * Returns { cnnWeight, landmarkWeight } that always sum to 1.0.
   *
   * Strategy:
   *   - Start from base weights (CNN=0.65, Landmark=0.35)
   *   - Adjust for specific degradation patterns
   *   - Clamp to [FUSION_WEIGHT_MIN, FUSION_WEIGHT_MAX]
   *   - Renormalize to sum to 1.0
   */
  computeFusionWeights(quality: FaceQualityMetrics): { cnnWeight: number; landmarkWeight: number } {
    let cnnWeight: number = THRESHOLDS.FUSION_WEIGHT_CNN_BASE;
    let landmarkWeight: number = THRESHOLDS.FUSION_WEIGHT_LANDMARKS_BASE;

    // ── Pattern: Partial Occlusion ──
    // When face is partially occluded, landmarks on visible regions are more
    // reliable than CNN which sees the whole (partially blocked) crop.
    if (quality.occlusion > 0.3) {
      const occlusionShift = lerp(0, 0.25, inverseLerp(0.3, 0.8, quality.occlusion));
      cnnWeight -= occlusionShift;
      landmarkWeight += occlusionShift;
    }

    // ── Pattern: Extreme Head Rotation ──
    // Large yaw/pitch degrades landmark-based geometric rules more than
    // the CNN (which was trained on multi-angle data).
    const maxPoseAngle = Math.max(
      quality.absYaw / THRESHOLDS.QUALITY_MAX_YAW_RAD,
      quality.absPitch / THRESHOLDS.QUALITY_MAX_PITCH_RAD
    );
    if (maxPoseAngle > 0.6) {
      const poseShift = lerp(0, 0.20, inverseLerp(0.6, 1.2, maxPoseAngle));
      cnnWeight += poseShift;
      landmarkWeight -= poseShift;
    }

    // ── Pattern: Poor Landmark Confidence ──
    // Low MediaPipe confidence → landmark branch is unreliable.
    if (quality.landmarkConfidence < 0.5) {
      const confShift = lerp(0, 0.20, inverseLerp(0.5, 0.15, quality.landmarkConfidence));
      cnnWeight += confShift;
      landmarkWeight -= confShift;
    }

    // ── Pattern: High Blur ──
    // Both branches degrade, but CNN degrades faster on blurry crops.
    // Move toward equal weighting.
    if (quality.blur > THRESHOLDS.QUALITY_BLUR_THRESHOLD) {
      const blurExcess = inverseLerp(
        THRESHOLDS.QUALITY_BLUR_THRESHOLD,
        1.0,
        quality.blur
      );
      const targetCnn = 0.50;
      const targetLandmark = 0.50;
      const blurBlend = blurExcess * 0.7; // Don't fully snap to 50/50
      cnnWeight = lerp(cnnWeight, targetCnn, blurBlend);
      landmarkWeight = lerp(landmarkWeight, targetLandmark, blurBlend);
    }

    // ── Pattern: Very Poor Overall Quality ──
    // When everything is degraded, pull both toward 50/50 (maximum uncertainty).
    if (quality.overallQuality < THRESHOLDS.MIN_FACE_QUALITY) {
      const degradation = inverseLerp(THRESHOLDS.MIN_FACE_QUALITY, 0.1, quality.overallQuality);
      cnnWeight = lerp(cnnWeight, 0.50, degradation * 0.5);
      landmarkWeight = lerp(landmarkWeight, 0.50, degradation * 0.5);
    }

    // ── Clamp & Renormalize ──
    cnnWeight = clamp(cnnWeight, THRESHOLDS.FUSION_WEIGHT_MIN, THRESHOLDS.FUSION_WEIGHT_MAX);
    landmarkWeight = clamp(landmarkWeight, THRESHOLDS.FUSION_WEIGHT_MIN, THRESHOLDS.FUSION_WEIGHT_MAX);

    // Renormalize to ensure they sum to exactly 1.0
    const total = cnnWeight + landmarkWeight;
    cnnWeight /= total;
    landmarkWeight /= total;

    return { cnnWeight, landmarkWeight };
  }

  // ── Private: Sub-Score Computation ──────────────────────────────────────

  /**
   * Compute face area as a fraction of the frame area.
   */
  private computeFaceSize(
    faceBox: { x: number; y: number; width: number; height: number } | null,
    frameWidth: number,
    frameHeight: number
  ): number {
    if (!faceBox || frameWidth <= 0 || frameHeight <= 0) return 0;
    // faceBox is in normalized coordinates [0, 1]
    const faceArea = faceBox.width * faceBox.height;
    return clamp(faceArea, 0, 1);
  }

  /**
   * Score face size: 1.0 when within ideal range, drops smoothly outside.
   */
  private scoreFaceSize(faceSize: number): number {
    if (faceSize <= 0) return 0;
    if (faceSize >= FACE_SIZE_IDEAL_MIN && faceSize <= FACE_SIZE_IDEAL_MAX) return 1.0;
    if (faceSize < FACE_SIZE_IDEAL_MIN) {
      // Ramp up from 0 at DROP_LOW to 1 at IDEAL_MIN
      if (faceSize <= FACE_SIZE_DROP_LOW) return 0;
      return inverseLerp(FACE_SIZE_DROP_LOW, FACE_SIZE_IDEAL_MIN, faceSize);
    }
    // faceSize > IDEAL_MAX: ramp down from 1 at IDEAL_MAX to 0 at DROP_HIGH
    if (faceSize >= FACE_SIZE_DROP_HIGH) return 0;
    return 1.0 - inverseLerp(FACE_SIZE_IDEAL_MAX, FACE_SIZE_DROP_HIGH, faceSize);
  }

  /**
   * Compute average brightness from face crop RGBA pixel data.
   * Returns normalized luminance in [0, 1].
   */
  private computeBrightness(pixels: Uint8ClampedArray | null, cropSize: number): number {
    if (!pixels || pixels.length === 0 || cropSize <= 0) return 0.5; // Assume mid-brightness if no data

    const totalPixels = cropSize * cropSize;
    const expectedLength = totalPixels * 4; // RGBA
    const pixelCount = Math.min(totalPixels, Math.floor(pixels.length / 4));
    if (pixelCount === 0) return 0.5;

    // Use ITU-R BT.601 luminance: Y = 0.299*R + 0.587*G + 0.114*B
    // Sample every 4th pixel for performance (still statistically representative)
    const step = Math.max(1, Math.floor(pixelCount / 1024));
    let luminanceSum = 0;
    let sampleCount = 0;

    for (let i = 0; i < pixelCount; i += step) {
      const offset = i * 4;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      luminanceSum += 0.299 * r + 0.587 * g + 0.114 * b;
      sampleCount++;
    }

    if (sampleCount === 0) return 0.5;
    return clamp(luminanceSum / (sampleCount * 255), 0, 1);
  }

  /**
   * Score brightness: 1.0 when in ideal range, drops toward extremes.
   */
  private scoreBrightness(brightness: number): number {
    if (brightness >= BRIGHTNESS_IDEAL_MIN && brightness <= BRIGHTNESS_IDEAL_MAX) return 1.0;
    if (brightness < BRIGHTNESS_IDEAL_MIN) {
      if (brightness <= BRIGHTNESS_DROP_LOW) return 0;
      return inverseLerp(BRIGHTNESS_DROP_LOW, BRIGHTNESS_IDEAL_MIN, brightness);
    }
    if (brightness >= BRIGHTNESS_DROP_HIGH) return 0;
    return 1.0 - inverseLerp(BRIGHTNESS_IDEAL_MAX, BRIGHTNESS_DROP_HIGH, brightness);
  }

  /**
   * Estimate blur from face crop pixels using a Laplacian-like variance measure.
   * Returns 0 = sharp, 1 = very blurry.
   *
   * Uses a simplified 3x3 Laplacian kernel convolution on grayscale values,
   * then computes variance. Low variance = blurry image.
   */
  private computeBlur(pixels: Uint8ClampedArray | null, cropSize: number): number {
    if (!pixels || pixels.length === 0 || cropSize < 3) return 0.5; // Assume mid-blur if no data

    const totalPixels = cropSize * cropSize;
    if (pixels.length < totalPixels * 4) return 0.5;

    // Convert to grayscale (subsample for performance on large crops)
    const stride = Math.max(1, Math.floor(cropSize / 64)); // Work on ~64x64 grid
    const effectiveSize = Math.floor(cropSize / stride);
    if (effectiveSize < 3) return 0.5;

    const requiredSize = effectiveSize * effectiveSize;
    const gray = requiredSize <= 4096 ? this.grayBuffer : new Float32Array(requiredSize);
    for (let row = 0; row < effectiveSize; row++) {
      for (let col = 0; col < effectiveSize; col++) {
        const srcRow = row * stride;
        const srcCol = col * stride;
        const offset = (srcRow * cropSize + srcCol) * 4;
        gray[row * effectiveSize + col] =
          0.299 * pixels[offset] + 0.587 * pixels[offset + 1] + 0.114 * pixels[offset + 2];
      }
    }

    // Apply 3x3 Laplacian kernel: [0, 1, 0; 1, -4, 1; 0, 1, 0]
    let laplacianSum = 0;
    let laplacianSqSum = 0;
    let count = 0;

    for (let row = 1; row < effectiveSize - 1; row++) {
      for (let col = 1; col < effectiveSize - 1; col++) {
        const center = gray[row * effectiveSize + col];
        const top = gray[(row - 1) * effectiveSize + col];
        const bottom = gray[(row + 1) * effectiveSize + col];
        const left = gray[row * effectiveSize + (col - 1)];
        const right = gray[row * effectiveSize + (col + 1)];

        const laplacian = top + bottom + left + right - 4 * center;
        laplacianSum += laplacian;
        laplacianSqSum += laplacian * laplacian;
        count++;
      }
    }

    if (count === 0) return 0.5;

    const mean = laplacianSum / count;
    const variance = laplacianSqSum / count - mean * mean;

    // Map variance to blur score: high variance = sharp (score 0), low variance = blurry (score 1)
    if (variance <= BLUR_MIN_VARIANCE) return 1.0;
    if (variance >= BLUR_LAPLACIAN_NORMALIZATION) return 0.0;

    return 1.0 - inverseLerp(BLUR_MIN_VARIANCE, BLUR_LAPLACIAN_NORMALIZATION, variance);
  }

  /**
   * Score head pose: 1.0 for frontal, drops with rotation.
   * Uses separate curves for yaw, pitch, roll and returns the minimum.
   */
  private scoreHeadPose(absYaw: number, absPitch: number, absRoll: number): number {
    const yawScore = absYaw <= POSE_YAW_IDEAL
      ? 1.0
      : absYaw >= POSE_YAW_MAX
        ? 0.0
        : 1.0 - inverseLerp(POSE_YAW_IDEAL, POSE_YAW_MAX, absYaw);

    const pitchScore = absPitch <= POSE_PITCH_IDEAL
      ? 1.0
      : absPitch >= POSE_PITCH_MAX
        ? 0.0
        : 1.0 - inverseLerp(POSE_PITCH_IDEAL, POSE_PITCH_MAX, absPitch);

    const rollScore = absRoll <= POSE_ROLL_IDEAL
      ? 1.0
      : absRoll >= POSE_ROLL_MAX
        ? 0.0
        : 1.0 - inverseLerp(POSE_ROLL_IDEAL, POSE_ROLL_MAX, absRoll);

    // Use geometric mean — penalizes strongly when any axis is extreme,
    // but doesn't zero out from mild rotation on a single axis
    return Math.cbrt(yawScore * pitchScore * rollScore);
  }

  /**
   * Estimate occlusion from landmark Z-depth confidence and detection confidence.
   * Landmarks with unusually deep Z values (pushed behind the face plane) or
   * missing landmarks suggest partial occlusion.
   *
   * Returns 0 = no occlusion, 1 = fully occluded.
   */
  private estimateOcclusion(
    landmarks: Array<{ x: number; y: number; z: number }> | null,
    landmarkConfidence: number
  ): number {
    // No landmarks at all → treat as fully occluded
    if (!landmarks || landmarks.length === 0) return 1.0;

    // Low detection confidence is itself an occlusion signal
    const confOcclusion = landmarkConfidence < 0.5
      ? lerp(0.6, 0.0, inverseLerp(0.1, 0.5, landmarkConfidence))
      : 0;

    // Sample key landmarks and check Z-depth anomalies
    let occludedCount = 0;
    let sampledCount = 0;

    for (const idx of OCCLUSION_LANDMARK_INDICES) {
      if (idx >= landmarks.length) continue;
      sampledCount++;
      const lm = landmarks[idx];
      // MediaPipe Z is relative depth — landmarks pushed far behind the face plane
      // (very negative Z) suggest that region is unreliable / occluded
      if (lm.z < LANDMARK_Z_OCCLUSION_THRESHOLD) {
        occludedCount++;
      }
    }

    if (sampledCount === 0) return 1.0;

    const zOcclusion = occludedCount / sampledCount;

    // Blend confidence-based and Z-depth-based signals
    return clamp(Math.max(confOcclusion, zOcclusion * 0.8), 0, 1);
  }
}

// ── Utility Functions ─────────────────────────────────────────────────────

/** Clamp a value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation: returns value between a and b at fraction t ∈ [0, 1]. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Inverse linear interpolation: returns fraction of value between a and b (clamped to [0, 1]). */
function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) return 0;
  return clamp((value - a) / (b - a), 0, 1);
}
