/**
 * MoodLens Shared Schemas - ML Model Registry & Benchmarks
 */

export type ModelQuantization = 'fp32' | 'fp16' | 'int8';

export interface ModelMetadata {
  model_id: string;
  version: string;
  architecture: string;
  quantization: ModelQuantization;
  format: 'onnx' | 'tflite' | 'coreml';
  file_name: string;
  sha256_hash: string;
  size_bytes: number;
  dataset_version: string;
  classes: string[];
  metrics: {
    accuracy: number;
    macro_f1: number;
    balanced_accuracy: number;
    per_class_recall: Record<string, number>;
    expected_calibration_error: number;
  };
  benchmarks: {
    avg_latency_ms: number;
    p95_latency_ms: number;
    fps: number;
    memory_mb: number;
  };
  supported_platforms: string[];
  is_active: boolean;
  is_fallback: boolean;
  release_date: string;
  rollback_version?: string;
}

export interface ModelRegistryResponse {
  models: ModelMetadata[];
  active_model_id: string;
  default_quantization: ModelQuantization;
}
