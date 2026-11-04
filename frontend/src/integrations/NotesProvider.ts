/**
 * MoodLens - Calming / Venting Notes Provider (Spec Section 34)
 * Provides private on-device journaling and thought discharge for tense or angry moments.
 */
import { IntegrationProvider } from './IntegrationProvider';
import { SuggestionContext, SuggestionItem } from '../../../shared/schemas/suggestion';
import { UserApprovedAction, ActionResult } from '../../../shared/schemas/action';

export class NotesProvider implements IntegrationProvider {
  public readonly id = 'notes_provider';
  public readonly name = 'Calming & Venting Notes';
  public readonly category = 'notes' as const;

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

    // Trigger after 2.5-3s sustained anger/tension
    if (expression === 'angry' && confidence >= 0.50 && durationSeconds >= 2.5) {
      this.lastTriggeredTime = now;
      return {
        id: `sug_notes_${now}`,
        rule_id: 'tense_moment_notes',
        category: 'notes',
        title: 'Clear Your Mind: Vent & Reset',
        message: 'Tension detected. Writing down your raw thoughts can help diffuse frustration and regain clarity.',
        reason: 'persistent_expression_angry',
        expression: 'angry',
        confidence,
        action_type: 'open_notes',
        action_payload: {
          buttonText: 'Open Venting Space',
          prompt: 'What is frustrating you right now? Let it out here in private (never leaves your device):',
        },
        requires_confirmation: false,
        expires_in_seconds: 35,
        created_at: now,
      };
    }

    return null;
  }

  public async execute(action: UserApprovedAction): Promise<ActionResult> {
    return {
      success: true,
      action_id: action.action_id,
      result_code: 'NOTES_MODAL_ACTIVE',
      message: 'Private venting space opened.',
    };
  }
}
