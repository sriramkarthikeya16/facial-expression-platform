/**
 * MoodLens Shared Schemas - Session Contracts
 */
import { ExpressionState, TrackingState, ExpressionProbabilities } from './expression';

export type SessionStatus = 'active' | 'paused' | 'ended';

export interface SessionCreatePayload {
  device_id: string;
  platform: 'web' | 'android' | 'ios' | 'desktop_windows' | 'desktop_macos' | 'desktop_linux';
  model_version?: string;
}

export interface SessionStateResponse {
  session_id: string;
  user_id: string;
  expression: ExpressionState;
  tracking_state: TrackingState;
  confidence: number;
  duration_seconds: number;
  quality: number;
  tracking: boolean;
  status: SessionStatus;
  timestamp: string;
}

export interface ExpressionEventBatchItem {
  timestamp: string;
  expression: ExpressionState;
  confidence: number;
  duration_seconds: number;
  quality_score: number;
  tracking_confidence: number;
  probabilities?: ExpressionProbabilities;
}
