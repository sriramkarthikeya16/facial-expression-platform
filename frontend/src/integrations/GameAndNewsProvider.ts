/**
 * MoodLens - Zen Focus Game & Positive News Provider
 * Caters to Neutral / Rest states with mindfulness games and uplifting global news.
 */
import { IntegrationProvider } from './IntegrationProvider';
import { SuggestionContext, SuggestionItem } from '../../../shared/schemas/suggestion';
import { UserApprovedAction, ActionResult } from '../../../shared/schemas/action';
import { INTEGRATION_CONFIG } from '../../../shared/configuration/integrations.config';

export class GameAndNewsProvider implements IntegrationProvider {
  public readonly id = 'game_news_provider';
  public readonly name = 'Zen Focus Game & Positive News';
  public readonly category = 'games' as const;

  private lastTriggeredTime = 0;
  private toggleState = 0;

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

    // Trigger on sustained neutral expression after 2.5-3s (idle/steady state)
    if (expression === 'neutral' && confidence >= 0.45 && durationSeconds >= 2.5) {
      this.lastTriggeredTime = now;
      this.toggleState = (this.toggleState + 1) % 2;

      if (this.toggleState === 0) {
        // Option 1: Zen Memory / Focus Tile Game
        return {
          id: `sug_game_${now}`,
          rule_id: 'neutral_focus_game',
          category: 'games',
          title: 'Zen Focus Memory Game',
          message: 'Steady focus detected. Take a playful 2-minute break with a relaxing emoji memory matching game.',
          reason: 'persistent_expression_neutral',
          expression: 'neutral',
          confidence,
          action_type: 'open_game',
          action_payload: {
            buttonText: 'Play Zen Game',
          },
          requires_confirmation: false,
          expires_in_seconds: 35,
          created_at: now,
        };
      } else {
        // Option 2: Uplifting Positive News
        const newsItem = INTEGRATION_CONFIG.NEWS.UPLIFTING_FEEDS[0];
        return {
          id: `sug_news_${now}`,
          rule_id: 'neutral_uplifting_news',
          category: 'news',
          title: 'Heartwarming Global News',
          message: 'Take a brief breather to read some positive, feel-good stories from around the world.',
          reason: 'persistent_expression_neutral',
          expression: 'neutral',
          confidence,
          action_type: 'open_news',
          action_payload: {
            url: newsItem.url,
            title: newsItem.title,
            buttonText: 'Read Good News',
          },
          requires_confirmation: true,
          expires_in_seconds: 35,
          created_at: now,
        };
      }
    }

    return null;
  }

  public async execute(action: UserApprovedAction): Promise<ActionResult> {
    if (action.action_type === 'open_game') {
      return {
        success: true,
        action_id: action.action_id,
        result_code: 'GAME_MODAL_ACTIVE',
        message: 'Zen memory game launched.',
      };
    }

    if (action.action_type === 'open_news') {
      if (!action.confirmed_by_user) {
        return {
          success: false,
          action_id: action.action_id,
          result_code: 'USER_REJECTED',
          message: 'News viewing was not confirmed.',
        };
      }
      const targetUrl = action.payload?.url || 'https://www.goodnewsnetwork.org/';
      if (typeof window !== 'undefined') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
      return {
        success: true,
        action_id: action.action_id,
        result_code: 'NEWS_OPENED',
        message: 'Opening uplifting news in a new tab.',
        data: { url: targetUrl },
      };
    }

    return {
      success: false,
      action_id: action.action_id,
      result_code: 'UNKNOWN_ACTION',
      message: `Unknown action type: ${action.action_type}`,
    };
  }
}
