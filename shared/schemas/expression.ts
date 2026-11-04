/**
 * MoodLens Shared Schemas - Expression & Tracking Contracts
 */

export type Emotion = 
  | 'happy'
  | 'sad'
  | 'angry'
  | 'fear'
  | 'disgust'
  | 'surprise'
  | 'neutral';

export type SystemState = 
  | 'occluded'
  | 'no_face'
  | 'multi_face_warning';

export type ExpressionState = Emotion | SystemState;

export type TrackingState = 
  | 'VISIBLE'
  | 'PARTIAL_OCCLUSION'
  | 'TEMPORARY_LOSS'
  | 'REDETECTION'
  | 'UNKNOWN';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CandidateFace {
  id: string;
  box: BoundingBox;
  confidence: number;
  qualityScore: number;
  area: number;
  isPrimary: boolean;
}

export interface ExpressionProbabilities {
  happy: number;
  sad: number;
  angry: number;
  fear: number;
  disgust: number;
  surprise: number;
  neutral: number;
}

export interface FacialFeatures {
  smileScore: number;
  surpriseScore: number;
  frownScore: number;
}

/**
 * ARKit-inspired expression representation derived from MediaPipe
 * Face Landmarker (478 landmarks + native blend shapes + head pose).
 *
 * NOT actual Apple ARKit blend shapes — this is an ARKit-inspired
 * expression vector for MoodLens web inference.
 *
 * All coefficients are normalized to 0–1 range unless otherwise noted.
 */
export interface ExpressionVector {
  // Eye features
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  eyeWideLeft: number;
  eyeWideRight: number;
  eyeSquintLeft: number;
  eyeSquintRight: number;

  // Eyebrow features
  browDownLeft: number;
  browDownRight: number;
  browInnerUp: number;
  browOuterUpLeft: number;
  browOuterUpRight: number;

  // Mouth features
  mouthSmileLeft: number;
  mouthSmileRight: number;
  mouthFrownLeft: number;
  mouthFrownRight: number;
  jawOpen: number;
  mouthPucker: number;
  mouthOpen: number;

  // Head pose (normalized -1 to 1)
  headPitch: number;
  headYaw: number;
  headRoll: number;
}

/** Ordered keys for ExpressionVector — used for array conversion */
export const EXPRESSION_VECTOR_KEYS: (keyof ExpressionVector)[] = [
  'eyeBlinkLeft', 'eyeBlinkRight', 'eyeWideLeft', 'eyeWideRight',
  'eyeSquintLeft', 'eyeSquintRight',
  'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
  'mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight',
  'jawOpen', 'mouthPucker', 'mouthOpen',
  'headPitch', 'headYaw', 'headRoll',
];

/**
 * Carries both the absolute expression vector and the baseline-relative delta.
 * The fusion classifier and future MLP receive all 40 features (20 absolute + 20 delta).
 */
export interface ExpressionFeatureState {
  absolute: ExpressionVector;
  delta: ExpressionVector;
  baseline: ExpressionVector | null;
}

/**
 * Face quality metrics used to drive dynamic fusion weights.
 * Integrates with the existing CV tracking state machine.
 */
export interface FaceQualityMetrics {
  /** MediaPipe landmark detection confidence (0–1) */
  landmarkConfidence: number;
  /** Face area as fraction of frame (0–1) */
  faceSize: number;
  /** Estimated blur level (0 = sharp, 1 = very blurry) */
  blur: number;
  /** Average face brightness (0–1, normalized from 0–255) */
  brightness: number;
  /** Absolute head yaw in radians (0 = frontal) */
  absYaw: number;
  /** Absolute head pitch in radians (0 = frontal) */
  absPitch: number;
  /** Absolute head roll in radians (0 = level) */
  absRoll: number;
  /** Estimated occlusion level (0 = none, 1 = fully occluded) */
  occlusion: number;
  /** Tracking confidence from the state machine (0–1) */
  trackingConfidence: number;
  /** Overall composite quality score (0–1) */
  overallQuality: number;
}

/** Calibration state for neutral baseline capture */
export type CalibrationState = 'idle' | 'calibrating' | 'calibrated' | 'failed';

export interface RawInferenceResult {
  probabilities: ExpressionProbabilities;
  topExpression: Emotion;
  confidence: number;
  qualityScore: number;
  trackingConfidence: number;
  latencyMs: number;
}

export interface SmoothedExpressionResult {
  expression: ExpressionState;
  trackingState: TrackingState;
  confidence: number;
  rawConfidence: number;
  probabilities: ExpressionProbabilities;
  durationSeconds: number;
  qualityScore: number;
  isStable: boolean;
  timestamp: number;
}

export interface RealtimePredictionPayload {
  timestamp: string;
  session_id: string;
  face_id: string;
  expression: ExpressionState;
  tracking_state: TrackingState;
  confidence: number;
  quality: number;
  tracking_confidence: number;
  face_visible: boolean;
  inference_latency_ms: number;
}
