/**
 * MoodLens - Contact Check-In Messaging Provider
 * Caters to Surprise / Unexpected moments with quick social reach-out prompts.
 */
import { IntegrationProvider } from './IntegrationProvider';
import { SuggestionContext, SuggestionItem } from '../../../shared/schemas/suggestion';
import { UserApprovedAction, ActionResult } from '../../../shared/schemas/action';
import { INTEGRATION_CONFIG } from '../../../shared/configuration/integrations.config';

export class MessagingProvider implements IntegrationProvider {
  public readonly id = 'messaging_provider';
  public readonly name = 'Contact Check-In';
  public readonly category = 'messaging' as const;

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

    // Trigger on surprise after 2.5-3s
    if (expression === 'surprise' && confidence >= 0.50 && durationSeconds >= 2.5) {
      this.lastTriggeredTime = now;
      return {
        id: `sug_msg_${now}`,
        rule_id: 'surprise_moment_checkin',
        category: 'messaging',
        title: 'Share the Moment: Reach Out',
        message: 'Something unexpected or exciting happen? Take a second to check in or share a smile with a friend.',
        reason: 'persistent_expression_surprise',
        expression: 'surprise',
        confidence,
        action_type: 'open_messaging',
        action_payload: {
          buttonText: 'Message a Friend',
          templates: INTEGRATION_CONFIG.MESSAGING.CHECKIN_TEMPLATES,
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
      result_code: 'MESSAGING_MODAL_ACTIVE',
      message: 'Contact check-in composer opened.',
    };
  }
}
