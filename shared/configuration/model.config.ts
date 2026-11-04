/**
 * MoodLens Shared Configuration - ML Model Configuration
 */

export const MODEL_CONFIG = {
  ACTIVE_MODEL_VERSION: '1.2.0',
  DEFAULT_INPUT_SIZE: 112,
  CHANNELS: 3,
  NORMALIZATION: {
    MEAN: [0.485, 0.456, 0.406],
    STD: [0.229, 0.224, 0.225],
  },
  SUPPORTED_QUANTIZATIONS: ['fp32', 'fp16', 'int8'] as const,
  DEFAULT_QUANTIZATION: 'fp32' as const,
  CLASS_ORDER: [
    'happy',
    'sad',
    'angry',
    'fear',
    'disgust',
    'surprise',
    'neutral',
  ] as const,
  CALIBRATION_TEMPERATURE: 0.75,
  CLASS_WEIGHTS: [1.45, 1.25, 1.25, 1.15, 1.15, 1.35, 0.65],
} as const;
