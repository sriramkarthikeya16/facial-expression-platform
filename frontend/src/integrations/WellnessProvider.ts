/**
 * MoodLens - Guided Wellness & Mindfulness Provider (Spec Section 33)
 * Provides 4-7-8 and Box Breathing, Grounding 5-4-3-2-1 exercises.
 */
import { IntegrationProvider } from './IntegrationProvider';
import { SuggestionContext, SuggestionItem } from '../../../shared/schemas/suggestion';
import { UserApprovedAction, ActionResult } from '../../../shared/schemas/action';
import { INTEGRATION_CONFIG } from '../../../shared/configuration/integrations.config';

export class WellnessProvider implements IntegrationProvider {
  public readonly id = 'wellness_provider';
  public readonly name = 'Mindfulness & Grounding';
  public readonly category = 'wellness' as const;

  private lastTriggeredTime = 0;

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async authorize(): Promise<boolean> {
    return true;
  }

  public async suggest(context: SuggestionContext): Promise<SuggestionItem | null> {
    const now = Date.now();
    // Responsive cooldown (2.5 seconds to support 3s, 4s, 5s live stream detection intervals)
    if (now - this.lastTriggeredTime < 2500) {
      return null;
    }

    const { expression, confidence, durationSeconds } = context;

    // ── Sad Emotion: Gentle Box Breathing (Triggers after 2.5-3s) ──
    if (expression === 'sad' && confidence >= 0.50 && durationSeconds >= 2.5) {
      this.lastTriggeredTime = now;
      return {
        id: `sug_wellness_${now}`,
        rule_id: 'sadness_comfort_breathing',
        category: 'wellness',
        title: 'Gentle Box Breathing',
        message: 'Feeling low or depleted? Take 2 minutes with guided 4-4-4-4 box breathing to center and refresh.',
        reason: 'persistent_expression_sad',
        expression: 'sad',
        confidence,
        action_type: 'breathing_exercise',
        action_payload: {
          pattern: INTEGRATION_CONFIG.WELLNESS.BREATHING_PATTERNS.box_breathing,
          name: 'Box Breathing (4-4-4-4)',
          buttonText: 'Start Box Breathing',
        },
        requires_confirmation: false,
        expires_in_seconds: 35,
        created_at: now,
      };
    }

    // ── Angry Emotion: Reset Breathing (Triggers after 2.5-3s) ──
    if (expression === 'angry' && confidence >= 0.50 && durationSeconds >= 2.5) {
      this.lastTriggeredTime = now;
      return {
        id: `sug_wellness_${now}`,
        rule_id: 'tense_moment_breathing',
        category: 'wellness',
        title: 'Calm the Storm: Box Breathing',
        message: 'Take a quick 2-minute box breathing session to diffuse tension and regain calm.',
        reason: 'persistent_expression_angry',
        expression: 'angry',
        confidence,
        action_type: 'breathing_exercise',
        action_payload: {
          pattern: INTEGRATION_CONFIG.WELLNESS.BREATHING_PATTERNS.box_breathing,
          name: 'Box Breathing (4-4-4-4)',
          buttonText: 'Start Box Breathing',
        },
        requires_confirmation: false,
        expires_in_seconds: 35,
        created_at: now,
      };
    }

    // ── Disgust Emotion: 5-4-3-2-1 Sensory Grounding (Triggers after 2.5-3s) ──
    if (expression === 'disgust' && confidence >= 0.50 && durationSeconds >= 2.5) {
      this.lastTriggeredTime = now;
      return {
        id: `sug_wellness_${now}`,
        rule_id: 'grounding_reset',
        category: 'meditation',
        title: '5-4-3-2-1 Sensory Grounding',
        message: 'Feeling unsettled or uneasy? Re-anchor your focus with guided 5-4-3-2-1 sensory grounding.',
        reason: 'persistent_expression_disgust',
        expression: 'disgust',
        confidence,
        action_type: 'open_meditation',
        action_payload: {
          name: '5-4-3-2-1 Sensory Grounding',
          steps: INTEGRATION_CONFIG.WELLNESS.GROUNDING_54321.steps,
          buttonText: 'Begin Grounding',
        },
        requires_confirmation: false,
        expires_in_seconds: 35,
        created_at: now,
      };
    }

    return null;
  }

  public async execute(action: UserApprovedAction): Promise<ActionResult> {
    if (action.action_type === 'open_meditation' || action.action_type === 'grounding_exercise') {
      return {
        success: true,
        action_id: action.action_id,
        result_code: 'MEDITATION_MODAL_ACTIVE',
        message: 'Guided 5-4-3-2-1 sensory grounding initiated.',
      };
    }

    return {
      success: true,
      action_id: action.action_id,
      result_code: 'BREATHING_MODAL_ACTIVE',
      message: 'Guided box breathing session initiated.',
    };
  }
}
