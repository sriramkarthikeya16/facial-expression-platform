/**
 * MoodLens Shared Configuration - Mathematical Thresholds & Tuning Constants
 */

export const THRESHOLDS = {
  // Temporal Smoothing
  EMA_ALPHA: 0.35, // Exponential Moving Average smoothing factor
  EMA_ALPHA_FAST: 0.65, // Fast response on high-confidence shift
  
  // Hysteresis State Transition Gates
  HYSTERESIS_ENTRY_THRESHOLD: 0.35, // Min confidence to enter new emotion state
  HYSTERESIS_EXIT_THRESHOLD: 0.25, // Threshold below which emotion decays
  HYSTERESIS_DOMINANCE_DELTA: 0.05, // Excess required over current probability
  
  // Occlusion & Tracking State Machine
  MIN_FACE_QUALITY: 0.35, // Quality score below which face is considered occluded
  MIN_TRACKING_CONFIDENCE: 0.40,
  OCCLUSION_TIMEOUT_MS: 2500, // Timeout after which TEMPORARY_LOSS transitions to UNKNOWN
  REDETECTION_INTERVAL_FRAMES: 30, // Periodically verify with full face detector
  
  // Minimum Persistence Durations (seconds)
  MIN_PERSISTENCE_HAPPY: 4.0,
  MIN_PERSISTENCE_SAD: 6.0,
  MIN_PERSISTENCE_ANGER: 5.0,
  MIN_PERSISTENCE_FEAR: 5.0,
  
  // Confidence Classification Tiers
  CONFIDENCE_TIER_UNKNOWN: 0.25,
  CONFIDENCE_TIER_WEAK: 0.50,
  CONFIDENCE_TIER_MODERATE: 0.75,
  CONFIDENCE_TIER_STRONG: 1.00,
  
  // Rate Limits & Cooldowns
  DEFAULT_SUGGESTION_COOLDOWN_SEC: 300, // 5 min
  SOS_SUGGESTION_COOLDOWN_SEC: 600, // 10 min
  ACTION_TOKEN_TTL_SEC: 60, // 1 minute action authorization TTL

  // ── Neutral Baseline Calibration ──
  BASELINE_CALIBRATION_DURATION_MS: 2000, // 2 seconds of neutral capture
  BASELINE_MIN_FRAMES: 15, // Minimum frames to form a reliable baseline
  BASELINE_MAX_FRAMES: 40, // Cap to prevent over-averaging

  // ── Temporal Smoothing: Rolling Window & Damping ──
  ROLLING_WINDOW_SIZE: 15, // Frames in the rolling window
  TRANSITION_DAMPING_FRAMES: 3, // Consecutive agreeing frames before state change

  // ── Confidence-Aware Fusion Base Weights ──
  // These are starting points — dynamically adjusted by FaceQuality
  FUSION_WEIGHT_CNN_BASE: 0.65,
  FUSION_WEIGHT_LANDMARKS_BASE: 0.35,
  // Minimum weight for either branch (prevents total suppression)
  FUSION_WEIGHT_MIN: 0.10,
  FUSION_WEIGHT_MAX: 0.90,

  // ── Expression-Specific EMA Rates ──
  // Faster = quicker response, Slower = requires sustained evidence
  EMA_ALPHA_SURPRISE: 0.55, // Fast — transient expression
  EMA_ALPHA_HAPPY: 0.35, // Medium
  EMA_ALPHA_ANGRY: 0.30, // Medium
  EMA_ALPHA_FEAR: 0.40, // Medium-fast
  EMA_ALPHA_SAD: 0.20, // Slow — sustained expression
  EMA_ALPHA_NEUTRAL: 0.25, // Stable — resist flicker
  EMA_ALPHA_DISGUST: 0.30, // Medium

  // ── Face Quality Thresholds ──
  QUALITY_MIN_FACE_SIZE: 0.04, // 4% of frame
  QUALITY_MAX_YAW_RAD: 0.60, // ~35° before quality drops
  QUALITY_MAX_PITCH_RAD: 0.50, // ~29° before quality drops
  QUALITY_MIN_BRIGHTNESS: 0.10, // 10% (very dark)
  QUALITY_MAX_BRIGHTNESS: 0.95, // 95% (blown out)
  QUALITY_BLUR_THRESHOLD: 0.65, // Above this = too blurry for CNN

  // ── Inference Scheduling ──
  CAMERA_FPS: 30, // Camera capture rate
  ML_INFERENCE_FPS: 15, // ML pipeline rate (every other frame)
  UI_UPDATE_FPS: 30, // UI rendering rate
} as const;
