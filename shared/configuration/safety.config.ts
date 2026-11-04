/**
 * MoodLens Shared Configuration - Safety Levels & Policy Matrix
 */
import { SafetyLevel, ActionRiskTier } from '../schemas/action';

export interface SafetyLevelDefinition {
  level: SafetyLevel;
  name: string;
  uiPresentation: 'status_bar' | 'toast' | 'card' | 'notification' | 'fullscreen_modal';
  requiresConfirmation: boolean;
  riskTier: ActionRiskTier;
}

export const SAFETY_LEVELS: Record<SafetyLevel, SafetyLevelDefinition> = {
  0: {
    level: 0,
    name: 'Normal Operating State',
    uiPresentation: 'status_bar',
    requiresConfirmation: false,
    riskTier: 'low',
  },
  1: {
    level: 1,
    name: 'Subtle Mood Shift (Informational)',
    uiPresentation: 'status_bar',
    requiresConfirmation: false,
    riskTier: 'low',
  },
  2: {
    level: 2,
    name: 'Contextual Suggestion (Music/Wellness)',
    uiPresentation: 'card',
    requiresConfirmation: false,
    riskTier: 'low',
  },
  3: {
    level: 3,
    name: 'External App Action (Food/Spotify Playback)',
    uiPresentation: 'toast',
    requiresConfirmation: true,
    riskTier: 'medium',
  },
  4: {
    level: 4,
    name: 'Wellness Escalation (Guided Grounding)',
    uiPresentation: 'notification',
    requiresConfirmation: true,
    riskTier: 'medium',
  },
  5: {
    level: 5,
    name: 'Acute Distress / Safety Intervention',
    uiPresentation: 'fullscreen_modal',
    requiresConfirmation: true,
    riskTier: 'high',
  },
};

export const OAUTH_SCOPES = {
  EXPRESSION_READ: 'expression.read',
  SUGGESTION_READ: 'suggestion.read',
  ACTION_REQUEST: 'action.request',
  ACTION_EXECUTE: 'action.execute',
} as const;
