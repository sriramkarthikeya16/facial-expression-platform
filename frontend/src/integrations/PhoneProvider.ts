/**
 * MoodLens - Phone & Trusted Contact Safety Provider (Spec Sections 30, 31, 32)
 * Manages phone dialer invocation (`tel:<number>`) exclusively following explicit user confirmation.
 */
import { IntegrationProvider } from './IntegrationProvider';
import { SuggestionContext, SuggestionItem } from '../../../shared/schemas/suggestion';
import { UserApprovedAction, ActionResult } from '../../../shared/schemas/action';
import { TrustedContact } from '../../../shared/schemas/user';

export class PhoneProvider implements IntegrationProvider {
  public readonly id = 'phone_provider';
  public readonly name = 'Trusted Contact & SOS';
  public readonly category = 'sos' as const;

  private lastTriggeredTime = 0;
  private defaultEmergencyContact: TrustedContact = {
    id: 'contact_support',
    name: 'Emergency Support / Trusted Contact',
    phone_number: '988', // Crisis Lifeline default
    is_favorite: true,
  };

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

    // Trigger on sustained fear pattern after 2.5-3s
    if (expression === 'fear' && confidence >= 0.50 && durationSeconds >= 2.5) {
      this.lastTriggeredTime = now;
      return {
        id: `sug_sos_${now}`,
        rule_id: 'acute_distress_intervention',
        category: 'sos',
        title: 'Need a little help?',
        message: 'You appear to be experiencing sustained signs of tension. Would you like to call your trusted contact or support line?',
        reason: 'persistent_expression_fear',
        expression: 'fear',
        confidence,
        action_type: 'call_trusted_contact',
        action_payload: {
          contact: this.defaultEmergencyContact,
          dialUri: `tel:${this.defaultEmergencyContact.phone_number}`,
          buttonText: 'Call Trusted Support',
        },
        requires_confirmation: true,
        expires_in_seconds: 60,
        created_at: now,
      };
    }

    return null;
  }

  public async execute(action: UserApprovedAction): Promise<ActionResult> {
    if (!action.confirmed_by_user) {
      return {
        success: false,
        action_id: action.action_id,
        result_code: 'CALL_DECLINED_BY_USER',
        message: 'Call cancelled by user.',
      };
    }

    const dialUri = action.payload?.dialUri || 'tel:988';
    
    // In web environment, invoke tel: protocol which launches system phone dialer
    window.location.href = dialUri;

    return {
      success: true,
      action_id: action.action_id,
      result_code: 'DIALER_INVOKED',
      message: `System dialer opened for ${dialUri} following explicit user click.`,
      data: { dialUri },
    };
  }
}
