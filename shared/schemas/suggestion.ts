/**
 * MoodLens Shared Schemas - Suggestion Contracts
 */
import type { Emotion } from './expression';

export type SuggestionCategory = 
  | 'music' 
  | 'wellness' 
  | 'food' 
  | 'sos' 
  | 'notes' 
  | 'games' 
  | 'news' 
  | 'messaging' 
  | 'meditation';

export type SuggestionDecision = 'accepted' | 'dismissed' | 'expired' | 'ignored' | 'disabled';

export interface SuggestionContext {
  expression: Emotion;
  confidence: number;
  durationSeconds: number;
  qualityScore: number;
  timeOfDayHour?: number;
  userContextInput?: string;
}

export interface SuggestionItem {
  id: string;
  rule_id: string;
  category: SuggestionCategory;
  title: string;
  message: string;
  reason: string;
  expression: Emotion;
  confidence: number;
  action_type: string;
  action_payload?: Record<string, any>;
  requires_confirmation: boolean;
  expires_in_seconds: number;
  created_at: string | number;
}

export interface SuggestionResponsePayload {
  suggestion_id: string;
  decision: SuggestionDecision;
  response_time_ms?: number;
}
