/**
 * MoodLens Shared Schemas - Action Authorization & Safety Contracts
 */

export type SafetyLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type ActionRiskTier = 'low' | 'medium' | 'high' | 'very_high';

export interface ActionAuthorizationRequest {
  action_id: string;
  action_type: string;
  category: string;
  target_resource?: string;
  parameters?: Record<string, any>;
  session_id: string;
}

export interface ActionAuthorizationToken {
  action_token: string;
  action_id: string;
  action_type: string;
  requires_confirmation: boolean;
  issued_at: string;
  expires_at: string;
  scopes_required: string[];
}

export interface UserApprovedAction {
  action_id: string;
  action_token: string;
  action_type: string;
  confirmed_by_user: boolean;
  confirmed_at: number;
  payload?: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  action_id: string;
  result_code: string;
  message: string;
  data?: Record<string, any>;
}
