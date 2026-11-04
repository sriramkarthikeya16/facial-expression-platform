import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TemporalSmoother } from '../ml/temporalSmoother';
import { ExpressionProbabilities, RawInferenceResult } from '../types/expression';

describe('TemporalSmoother & Hysteresis Smoothing', () => {
  const neutralProbs: ExpressionProbabilities = {
    happy: 0.05,
    sad: 0.05,
    angry: 0.05,
    fear: 0.05,
    disgust: 0.05,
    surprise: 0.05,
    neutral: 0.70,
  };

  const happyProbs: ExpressionProbabilities = {
    happy: 0.88,
    sad: 0.02,
    angry: 0.02,
    fear: 0.02,
    disgust: 0.02,
    surprise: 0.02,
    neutral: 0.02,
  };

  test('initializes and detects no_face when face is not detected', () => {
    const smoother = new TemporalSmoother();
    const raw: RawInferenceResult = {
      probabilities: neutralProbs,
      topExpression: 'neutral',
      confidence: 0.70,
      qualityScore: 0.9,
      trackingConfidence: 0.9,
      latencyMs: 30,
    };

    const result = smoother.process(raw, false, 0);
    assert.equal(result.expression, 'no_face');
    assert.equal(result.confidence, 0);
  });

  test('detects visible face and transitions to neutral', () => {
    const smoother = new TemporalSmoother();
    const raw: RawInferenceResult = {
      probabilities: neutralProbs,
      topExpression: 'neutral',
      confidence: 0.85,
      qualityScore: 0.95,
      trackingConfidence: 0.95,
      latencyMs: 30,
    };

    // Feed several frames to transition CV state machine to VISIBLE
    let res;
    for (let i = 0; i < 8; i++) {
      res = smoother.process(raw, true, 1);
    }

    assert.equal(res?.expression, 'neutral');
    assert.ok(res.confidence > 0.6);
  });

  test('transitions to sustained happy emotion with transition damping', () => {
    const smoother = new TemporalSmoother();
    const rawNeutral: RawInferenceResult = {
      probabilities: neutralProbs,
      topExpression: 'neutral',
      confidence: 0.80,
      qualityScore: 0.95,
      trackingConfidence: 0.95,
      latencyMs: 30,
    };

    // Seed into neutral
    for (let i = 0; i < 8; i++) {
      smoother.process(rawNeutral, true, 1);
    }

    // Now send happy frames
    const rawHappy: RawInferenceResult = {
      probabilities: happyProbs,
      topExpression: 'happy',
      confidence: 0.88,
      qualityScore: 0.95,
      trackingConfidence: 0.95,
      latencyMs: 30,
    };

    let finalRes;
    for (let i = 0; i < 10; i++) {
      finalRes = smoother.process(rawHappy, true, 1);
    }

    assert.equal(finalRes?.expression, 'happy');
    assert.ok(finalRes.confidence >= 0.70);
  });
});
