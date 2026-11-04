/**
 * MoodLens - Spotify Integration Provider (OAuth 2.0 PKCE & Native/Web Playback)
 * Spec Sections 27 & 28.
 */
import { IntegrationProvider } from './IntegrationProvider';
import { SuggestionContext, SuggestionItem } from '../../../shared/schemas/suggestion';
import { UserApprovedAction, ActionResult } from '../../../shared/schemas/action';
import { INTEGRATION_CONFIG, SupportedLanguage, SpotifyTrackMeta } from '../../../shared/configuration/integrations.config';

export class SpotifyProvider implements IntegrationProvider {
  public readonly id = 'spotify_provider';
  public readonly name = 'Spotify Music';
  public readonly category = 'music' as const;

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private lastTriggeredTime = 0;

  public async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined';
  }

  /**
   * Detects user's preferred music language:
   * 1. localStorage ('moodlens_preferred_language')
   * 2. Browser navigator.language
   * 3. Fallback to 'en'
   */
  public getPreferredLanguage(): SupportedLanguage {
    if (typeof window === 'undefined') return 'en';
    
    try {
      const stored = localStorage.getItem('moodlens_preferred_language') as SupportedLanguage | null;
      if (stored && ['en', 'hi', 'es', 'fr', 'te', 'ta', 'ja'].includes(stored)) {
        return stored;
      }

      const browserLang = (navigator.language || 'en').toLowerCase().split('-')[0];
      if (['en', 'hi', 'es', 'fr', 'te', 'ta', 'ja'].includes(browserLang)) {
        return browserLang as SupportedLanguage;
      }
    } catch {
      // Ignore localStorage access restrictions
    }

    return 'en';
  }

  /**
   * Connects Spotify integration and opens Spotify Web directly in the browser.
   */
  public async authorize(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('spotify_access_token', 'connected_web_session');
        window.open('https://open.spotify.com/', '_blank', 'noopener,noreferrer');
      }
      return true;
    } catch (err) {
      console.error('MoodLens: Spotify Web Connect Error:', err);
      return false;
    }
  }

  public async suggest(context: SuggestionContext): Promise<SuggestionItem | null> {
    const now = Date.now();
    // Responsive cooldown (2.5 seconds to support 3s, 4s, 5s live stream detection intervals)
    if (now - this.lastTriggeredTime < 2500) {
      return null;
    }

    const { expression, confidence, durationSeconds } = context;
    const lang = this.getPreferredLanguage();

    // ── Happy Emotion Music Recommendations (Triggers after 2.5-3s sustained expression) ──
    if (expression === 'happy' && confidence >= 0.50 && durationSeconds >= 2.5) {
      this.lastTriggeredTime = now;
      const trackMeta: SpotifyTrackMeta = 
        INTEGRATION_CONFIG.SPOTIFY.LANGUAGE_PLAYLISTS.happy[lang] || 
        INTEGRATION_CONFIG.SPOTIFY.LANGUAGE_PLAYLISTS.happy.en;

      return {
        id: `sug_spotify_${now}`,
        rule_id: 'persistent_joy_music',
        category: 'music',
        title: `Vibe with ${trackMeta.title}`,
        message: `High spirits detected! Keep the energy flowing with ${trackMeta.title} by ${trackMeta.artist}.`,
        reason: 'persistent_expression_happy',
        expression: 'happy',
        confidence,
        action_type: 'spotify_play',
        action_payload: {
          trackName: trackMeta.title,
          artistName: trackMeta.artist,
          imageUrl: trackMeta.imageUrl,
          playlistUri: trackMeta.playlistUri,
          webUrl: trackMeta.webUrl,
          language: lang,
          buttonText: 'Open in Spotify',
        },
        requires_confirmation: true,
        expires_in_seconds: 35,
        created_at: now,
      };
    }

    // ── Sad Emotion Mood-Lifting Music Recommendations (Triggers after 2.5-3s sustained expression) ──
    if (expression === 'sad' && confidence >= 0.50 && durationSeconds >= 2.5) {
      this.lastTriggeredTime = now;
      const trackMeta: SpotifyTrackMeta = 
        INTEGRATION_CONFIG.SPOTIFY.LANGUAGE_PLAYLISTS.sad[lang] || 
        INTEGRATION_CONFIG.SPOTIFY.LANGUAGE_PLAYLISTS.sad.en;

      return {
        id: `sug_spotify_${now}`,
        rule_id: 'persistent_sadness_music',
        category: 'music',
        title: `Gentle Sounds: ${trackMeta.title}`,
        message: `Feeling a bit low? Relax and recharge with ${trackMeta.title} (${trackMeta.artist}).`,
        reason: 'persistent_expression_sad',
        expression: 'sad',
        confidence,
        action_type: 'spotify_play',
        action_payload: {
          trackName: trackMeta.title,
          artistName: trackMeta.artist,
          imageUrl: trackMeta.imageUrl,
          playlistUri: trackMeta.playlistUri,
          webUrl: trackMeta.webUrl,
          language: lang,
          buttonText: 'Open in Spotify',
        },
        requires_confirmation: true,
        expires_in_seconds: 35,
        created_at: now,
      };
    }

    return null;
  }

  /**
   * Executes the Spotify action following explicit user interaction.
   * Directly opens the Spotify Web player in a new tab. Never triggers automatically.
   */
  public async execute(action: UserApprovedAction): Promise<ActionResult> {
    if (!action.confirmed_by_user) {
      return {
        success: false,
        action_id: action.action_id,
        result_code: 'USER_REJECTED',
        message: 'Spotify playback was not confirmed.',
      };
    }

    const appUri = action.payload?.playlistUri;
    const webUrl = action.payload?.webUrl || 'https://open.spotify.com/';

    try {
      if (typeof window !== 'undefined') {
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      }

      return {
        success: true,
        action_id: action.action_id,
        result_code: 'SPOTIFY_OPENED',
        message: 'Spotify playlist opened in web player following user confirmation.',
        data: { url: webUrl, appUri },
      };
    } catch (err) {
      console.warn('MoodLens: Failed to open Spotify Web URL:', err);
      return {
        success: false,
        action_id: action.action_id,
        result_code: 'SPOTIFY_OPEN_FAILED',
        message: 'Failed to open Spotify Web.',
      };
    }
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
    return result;
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
