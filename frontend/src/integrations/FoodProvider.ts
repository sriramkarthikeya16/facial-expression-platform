/**
 * MoodLens - Food Contextual Suggestion Provider (Spec Section 29)
 * Expression ≠ Hunger. Combines Time of Day + explicit user context + dynamic multi-provider food deep links.
 * Supports Swiggy, Zomato, Uber Eats, and DoorDash based on user preferences.
 */
import { IntegrationProvider } from './IntegrationProvider';
import { SuggestionContext, SuggestionItem } from '../../../shared/schemas/suggestion';
import { UserApprovedAction, ActionResult } from '../../../shared/schemas/action';
import { INTEGRATION_CONFIG } from '../../../shared/configuration/integrations.config';

export interface FoodProviderDetails {
  id: string;
  name: string;
  url: string;
  buttonLabel: string;
}

export const FOOD_PLATFORMS: Record<string, FoodProviderDetails> = {
  swiggy: {
    id: 'swiggy',
    name: 'Swiggy',
    url: 'https://www.swiggy.com',
    buttonLabel: 'Order on Swiggy',
  },
  zomato: {
    id: 'zomato',
    name: 'Zomato',
    url: 'https://www.zomato.com',
    buttonLabel: 'Order on Zomato',
  },
  ubereats: {
    id: 'ubereats',
    name: 'Uber Eats',
    url: 'https://www.ubereats.com',
    buttonLabel: 'Order on Uber Eats',
  },
  doordash: {
    id: 'doordash',
    name: 'DoorDash',
    url: 'https://www.doordash.com',
    buttonLabel: 'Order on DoorDash',
  },
};

export class FoodProvider implements IntegrationProvider {
  public readonly id = 'food_provider';
  public readonly name = 'Food Delivery';
  public readonly category = 'food' as const;

  private lastTriggeredTime = 0;

  private getSelectedPlatform(): FoodProviderDetails {
    const pref =
      (typeof localStorage !== 'undefined' &&
        localStorage.getItem('moodlens_preferred_food_provider')) ||
      'swiggy';
    return FOOD_PLATFORMS[pref] || FOOD_PLATFORMS.swiggy;
  }

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

    const platform = this.getSelectedPlatform();
    const currentHour = new Date().getHours();
    const isLunchTime = currentHour >= 12 && currentHour <= 14;
    const isDinnerTime = currentHour >= 19 && currentHour <= 21;
    const isSnackTime = currentHour >= 16 && currentHour <= 18;

    // Trigger on angry expression after 2.5-3s as a comfort snack/drink suggestion
    if (context.expression === 'angry' && context.confidence >= 0.50 && context.durationSeconds >= 2.5) {
      this.lastTriggeredTime = now;
      return {
        id: `sug_food_${now}`,
        rule_id: 'stress_comfort_break',
        category: 'food',
        title: 'Step away for a soothing drink or snack?',
        message: `A short hydration or snack break can give your mind the space it needs to reset. Browse calming options on ${platform.name}.`,
        reason: 'persistent_expression_angry',
        expression: context.expression,
        confidence: context.confidence,
        action_type: 'open_food_app',
        action_payload: {
          deepLink: platform.url,
          appName: platform.name,
          buttonText: `Order Snack on ${platform.name}`,
        },
        requires_confirmation: true,
        expires_in_seconds: 40,
        created_at: now,
      };
    }

    // Trigger if sustained neutral/fatigue coincides with meal hours (after 3.5s)
    if ((isLunchTime || isDinnerTime || isSnackTime) && context.durationSeconds >= 3.5) {
      this.lastTriggeredTime = now;
      const mealType = isLunchTime ? 'Lunch' : isDinnerTime ? 'Dinner' : 'Snack';
      return {
        id: `sug_food_${now}`,
        rule_id: `meal_time_${mealType.toLowerCase()}`,
        category: 'food',
        title: `Time for a ${mealType} break?`,
        message: `It's ${mealType} time. Would you like to browse delicious options on ${platform.name} in your browser?`,
        reason: 'contextual_time_of_day',
        expression: context.expression,
        confidence: context.confidence,
        action_type: 'open_food_app',
        action_payload: {
          deepLink: platform.url,
          appName: platform.name,
          buttonText: `Order on ${platform.name}`,
        },
        requires_confirmation: true,
        expires_in_seconds: 45,
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
        result_code: 'USER_CANCELLED',
        message: 'Food suggestion dismissed.',
      };
    }

    const platform = this.getSelectedPlatform();
    const url = action.payload?.deepLink || platform.url;
    window.open(url, '_blank', 'noopener,noreferrer');

    return {
      success: true,
      action_id: action.action_id,
      result_code: 'FOOD_APP_OPENED',
      message: `${platform.name} opened in browser following user confirmation.`,
    };
  }
}
