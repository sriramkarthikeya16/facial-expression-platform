import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SuggestionEngine } from '../ml/suggestionEngine';
import { SmoothedExpressionResult, PrimaryExpression } from '../types/expression';
import { useExpressionStore } from '../store/expressionStore';

describe('Live Stream Detection (3s, 4s, 5s) & Suggestion Triggers', () => {
  const engine = new SuggestionEngine();

  const makeSmoothed = (
    expression: PrimaryExpression,
    durationSeconds: number,
    confidence = 0.85
  ): SmoothedExpressionResult => ({
    expression,
    trackingState: 'VISIBLE',
    confidence,
    rawConfidence: confidence,
    probabilities: {
      happy: expression === 'happy' ? confidence : 0.05,
      sad: expression === 'sad' ? confidence : 0.05,
      angry: expression === 'angry' ? confidence : 0.05,
      fear: expression === 'fear' ? confidence : 0.05,
      disgust: expression === 'disgust' ? confidence : 0.05,
      surprise: expression === 'surprise' ? confidence : 0.05,
      neutral: expression === 'neutral' ? confidence : 0.05,
    },
    durationSeconds,
    qualityScore: 0.95,
    isStable: true,
    timestamp: Date.now(),
  });

  test('generates suggestions for 3s, 4s, and 5s timer windows', async () => {
    for (const interval of [3, 4, 5]) {
      const windowEngine = new SuggestionEngine();
      const smoothed = makeSmoothed('happy', interval);
      const sug = await windowEngine.evaluate(smoothed, null, []);
      assert.ok(sug !== null, `Expected suggestion for ${interval}s window`);
      assert.equal(sug.expressionTrigger, 'happy');
      assert.equal(sug.category, 'music');
    }
  });

  test('evaluates all 7 primary emotions for live stream detections', async () => {
    const emotions: PrimaryExpression[] = [
      'happy',
      'sad',
      'angry',
      'fear',
      'disgust',
      'surprise',
      'neutral',
    ];

    for (const expr of emotions) {
      const freshEngine = new SuggestionEngine();
      const smoothed = makeSmoothed(expr, 3.5, 0.85);
      const sug = await freshEngine.evaluate(smoothed, null, []);
      assert.ok(
        sug !== null,
        `Expected suggestion for emotion '${expr}' across 3s-5s detection window`
      );
      assert.equal(sug.expressionTrigger, expr);
    }
  });

  test('expression store updates and refreshes active suggestions on timer triggers', () => {
    useExpressionStore.getState().reset();
    assert.equal(useExpressionStore.getState().activeSuggestions.length, 0);

    // Initial 3s window suggestion
    useExpressionStore.getState().addSuggestion({
      id: 'sug_test_1',
      ruleId: 'persistent_joy_music',
      category: 'music',
      title: 'Vibe with Happy Hits (1st Snapshot)',
      message: 'High spirits detected at 3s',
      expressionTrigger: 'happy',
      confidence: 0.88,
      actionType: 'spotify_play',
      requiresConfirmation: true,
      expiresInSeconds: 35,
      createdAt: Date.now(),
    });

    assert.equal(useExpressionStore.getState().activeSuggestions.length, 1);
    assert.equal(
      useExpressionStore.getState().activeSuggestions[0].title,
      'Vibe with Happy Hits (1st Snapshot)'
    );

    // Subsequent 6s window suggestion for the same rule refreshes and moves to front
    useExpressionStore.getState().addSuggestion({
      id: 'sug_test_2',
      ruleId: 'persistent_joy_music',
      category: 'music',
      title: 'Vibe with Happy Hits (2nd Snapshot)',
      message: 'High spirits detected at 6s',
      expressionTrigger: 'happy',
      confidence: 0.92,
      actionType: 'spotify_play',
      requiresConfirmation: true,
      expiresInSeconds: 35,
      createdAt: Date.now(),
    });

    // Length should remain 1 (replaces same ruleId) and title should be latest
    assert.equal(useExpressionStore.getState().activeSuggestions.length, 1);
    assert.equal(
      useExpressionStore.getState().activeSuggestions[0].title,
      'Vibe with Happy Hits (2nd Snapshot)'
    );
    assert.equal(useExpressionStore.getState().activeSuggestions[0].confidence, 0.92);
  });
});
