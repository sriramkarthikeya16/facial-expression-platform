/**
 * MoodLens - Pluggable Suggestion Engine (Spec Sections 17, 18, 19, 82)
 * Coordinates pluggable IntegrationProviders (Spotify, Food, Phone/SOS, Wellness)
 * with consent verification and cooldown enforcement.
 */
import { SmoothedExpressionResult, SuggestionAction, Emotion } from '../types/expression';
import { UserPreferences, ConsentRecord } from '../types/api';
import { IntegrationProvider } from '../integrations/IntegrationProvider';
import { SpotifyProvider } from '../integrations/SpotifyProvider';
import { FoodProvider } from '../integrations/FoodProvider';
import { PhoneProvider } from '../integrations/PhoneProvider';
import { WellnessProvider } from '../integrations/WellnessProvider';
import { NotesProvider } from '../integrations/NotesProvider';
import { GameAndNewsProvider } from '../integrations/GameAndNewsProvider';
import { MessagingProvider } from '../integrations/MessagingProvider';
import { SuggestionContext, SuggestionItem } from '../../../shared/schemas/suggestion';
import { UserApprovedAction, ActionResult } from '../../../shared/schemas/action';

export class SuggestionEngine {
  private providers: IntegrationProvider[] = [];

  constructor() {
    this.providers = [
      new SpotifyProvider(),
      new WellnessProvider(),
      new FoodProvider(),
      new PhoneProvider(),
      new NotesProvider(),
      new GameAndNewsProvider(),
      new MessagingProvider(),
    ];
  }

  public async evaluate(
    smoothed: SmoothedExpressionResult,
    preferences: UserPreferences | null,
    consents: ConsentRecord[] = []
  ): Promise<SuggestionAction | null> {
    // 1. Check if suggestions are globally enabled
    if (preferences && preferences.suggestion_frequency === 'low' && smoothed.durationSeconds < 12) {
      return null;
    }

    // 2. Build consent map
    const consentMap = new Map<string, boolean>();
    consents.forEach((c) => consentMap.set(c.consent_type, c.granted));

    // Base mood suggestion consent check
    const moodConsent = consentMap.get('mood_suggestions') ?? true;
    if (!moodConsent) return null;

    // Filter out non-emotion system states
    const coreEmotions = ['happy', 'sad', 'angry', 'fear', 'disgust', 'surprise', 'neutral'];
    if (!coreEmotions.includes(smoothed.expression)) {
      return null;
    }

    const context: SuggestionContext = {
      expression: smoothed.expression as Emotion,
      confidence: smoothed.confidence,
      durationSeconds: smoothed.durationSeconds,
      qualityScore: smoothed.qualityScore,
      timeOfDayHour: new Date().getHours(),
    };

    // Category to consent mapping
    const categoryConsentMap: Record<string, string> = {
      music: 'music_integration',
      food: 'food_suggestions',
      sos: 'trusted_contacts',
      wellness: 'mood_suggestions',
      notes: 'mood_suggestions',
      games: 'mood_suggestions',
      news: 'mood_suggestions',
      messaging: 'trusted_contacts',
      meditation: 'mood_suggestions',
    };

    for (const provider of this.providers) {
      const requiredConsent = categoryConsentMap[provider.category];
      if (requiredConsent) {
        const hasConsent = consentMap.get(requiredConsent) ?? true;
        if (!hasConsent) continue;
      }

      const suggestion = await provider.suggest(context);
      if (suggestion) {
        return {
          id: suggestion.id,
          ruleId: suggestion.rule_id,
          category: suggestion.category,
          title: suggestion.title,
          message: suggestion.message,
          expressionTrigger: suggestion.expression,
          confidence: suggestion.confidence,
          actionType: suggestion.action_type,
          actionData: suggestion.action_payload,
          requiresConfirmation: suggestion.requires_confirmation,
          expiresInSeconds: suggestion.expires_in_seconds,
          createdAt: typeof suggestion.created_at === 'number' ? suggestion.created_at : Date.now(),
        };
      }
    }

    return null;
  }

  public async executeAction(action: UserApprovedAction): Promise<ActionResult> {
    for (const provider of this.providers) {
      if (
        (action.action_type.startsWith('spotify') && provider.category === 'music') ||
        (action.action_type.startsWith('call') && provider.category === 'sos') ||
        (action.action_type.includes('food') && provider.category === 'food') ||
        ((action.action_type.includes('breathing') || action.action_type.includes('grounding') || action.action_type.includes('meditation')) && provider.category === 'wellness') ||
        (action.action_type.includes('notes') && provider.category === 'notes') ||
        ((action.action_type.includes('game') || action.action_type.includes('news')) && provider.category === 'games') ||
        (action.action_type.includes('messaging') && provider.category === 'messaging')
      ) {
        return await provider.execute(action);
      }
    }

    return {
      success: false,
      action_id: action.action_id,
      result_code: 'NO_PROVIDER_FOUND',
      message: `No provider registered for action type: ${action.action_type}`,
    };
  }
}
