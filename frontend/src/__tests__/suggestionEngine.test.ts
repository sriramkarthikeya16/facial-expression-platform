import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SuggestionEngine } from '../ml/suggestionEngine';
import { SmoothedExpressionResult } from '../types/expression';
import { UserApprovedAction } from '../../../shared/schemas/action';

describe('SuggestionEngine Policy & Consent Evaluation', () => {
  const engine = new SuggestionEngine();

  test('does not issue suggestions for non-emotion states (e.g. no_face)', async () => {
    const smoothed: SmoothedExpressionResult = {
      expression: 'no_face',
      trackingState: 'UNKNOWN',
      confidence: 0,
      rawConfidence: 0,
      probabilities: { happy: 0, sad: 0, angry: 0, fear: 0, disgust: 0, surprise: 0, neutral: 0 },
      durationSeconds: 15,
      qualityScore: 0,
      isStable: false,
      timestamp: Date.now(),
    };

    const suggestion = await engine.evaluate(smoothed, null, []);
    assert.equal(suggestion, null);
  });

  test('respects consent denial for mood_suggestions', async () => {
    const smoothed: SmoothedExpressionResult = {
      expression: 'happy',
      trackingState: 'VISIBLE',
      confidence: 0.90,
      rawConfidence: 0.90,
      probabilities: { happy: 0.9, sad: 0, angry: 0, fear: 0, disgust: 0, surprise: 0, neutral: 0.1 },
      durationSeconds: 5,
      qualityScore: 0.95,
      isStable: true,
      timestamp: Date.now(),
    };

    const consents = [
      { consent_type: 'mood_suggestions', granted: false, version: '1.0' },
    ];

    const suggestion = await engine.evaluate(smoothed, null, consents);
    assert.equal(suggestion, null);
  });

  test('issues suggestion with strict user confirmation requirement for sustained expression', async () => {
    const freshEngine = new SuggestionEngine();
    const smoothed: SmoothedExpressionResult = {
      expression: 'happy',
      trackingState: 'VISIBLE',
      confidence: 0.85,
      rawConfidence: 0.85,
      probabilities: { happy: 0.85, sad: 0, angry: 0, fear: 0, disgust: 0, surprise: 0, neutral: 0.15 },
      durationSeconds: 4.0,
      qualityScore: 0.95,
      isStable: true,
      timestamp: Date.now(),
    };

    const consents = [
      { consent_type: 'mood_suggestions', granted: true, version: '1.0' },
      { consent_type: 'music_integration', granted: true, version: '1.0' },
    ];

    const suggestion = await freshEngine.evaluate(smoothed, null, consents);
    if (suggestion) {
      assert.equal(suggestion.requiresConfirmation, true);
      assert.equal(suggestion.category, 'music');
    }
  });

  test('action execution invariant: rejects unconfirmed sensitive actions', async () => {
    const action: UserApprovedAction = {
      action_id: 'act_test_unconfirmed',
      action_token: 'tok_test',
      action_type: 'spotify_play_playlist',
      payload: { playlistUri: 'spotify:playlist:test' },
      confirmed_by_user: false,
      confirmed_at: Date.now(),
    };

    const result = await engine.executeAction(action);
    assert.equal(result.success, false);
    assert.ok(result.result_code === 'USER_REJECTED' || result.result_code === 'USER_CANCELLED');
  });
});
