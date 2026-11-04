/**
 * MoodLens - API Types Grounded in shared contracts
 */
import { ConsentCategory, ConsentRecord as SharedConsentRecord } from '../../../shared/schemas/consent';
import { TrustedContact, UserExportDataPackage, UserRole } from '../../../shared/schemas/user';

export type { ConsentCategory, TrustedContact, UserExportDataPackage, UserRole };

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface UserPreferences {
  id?: string;
  user_id?: string;
  theme: 'light' | 'dark' | 'system';
  notification_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  suggestion_frequency: 'low' | 'balanced' | 'high';
  music_genres?: string[];
  preferred_playlists?: string[];
  preferred_food_apps?: string[];
}

export interface ConsentRecord {
  id?: string;
  user_id?: string;
  consent_type: ConsentCategory | string;
  granted: boolean;
  granted_at?: string;
  revoked_at?: string;
  version: string;
  created_at?: string;
}

export interface DetectionSessionDTO {
  id: string;
  user_id: string;
  device_id?: string;
  platform: string;
  model_version?: string;
  started_at: string;
  ended_at?: string;
  total_duration_seconds?: number;
  status: 'active' | 'completed' | 'abandoned';
}

export interface ExpressionEventDTO {
  id: string;
  session_id: string;
  expression: string;
  confidence: number;
  duration_seconds: number;
  quality_score?: number;
  recorded_at: string;
}

export interface PaginatedSessions {
  items: DetectionSessionDTO[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface ModelDTO {
  model_id: string;
  version: string;
  architecture: string;
  quantization: string;
  format: string;
  file_name: string;
  sha256_hash: string;
  size_bytes: number;
  dataset_version: string;
  accuracy: number;
  macro_f1: number;
  balanced_accuracy: number;
  expected_calibration_error: number;
  metrics_json?: Record<string, any>;
  benchmarks_json?: Record<string, any>;
  is_active: boolean;
  is_fallback: boolean;
  rollback_version?: string | null;
  created_at: string;
}

export interface ModelRegistryListDTO {
  models: ModelDTO[];
  active_model_id: string | null;
  total: number;
}

export interface EmotionFrequencyDTO {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface AdminTelemetryDTO {
  total_users: number;
  total_sessions: number;
  active_sessions: number;
  completed_sessions: number;
  total_events: number;
  avg_confidence: number;
  low_confidence_rate: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
  suggestion_ctr: number;
  total_suggestions: number;
  accepted_suggestions: number;
  dismissed_suggestions: number;
  expired_suggestions: number;
  emotion_frequencies: EmotionFrequencyDTO[];
  active_model?: ModelDTO | null;
  models: ModelDTO[];
  zero_biometric_storage_verified: boolean;
  gdpr_audit_compliant: boolean;
}
