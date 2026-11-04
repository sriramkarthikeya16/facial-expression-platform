/**
 * MoodLens — Landmark Expression Scorer (Phase 1: Rule-Based)
 *
 * Converts an ARKit-inspired ExpressionVector into 7-class emotion probabilities
 * using hand-designed expression rules grounded in Ekman's FACS (Facial Action Coding System).
 */
import { ExpressionVector, ExpressionProbabilities, ExpressionFeatureState } from '../types/expression';

export class LandmarkScorer {

  /**
   * Score an expression feature state into emotion probabilities.
   * Uses both absolute values and baseline-relative deltas.
   */
  public score(featureState: ExpressionFeatureState): ExpressionProbabilities {
    const abs = featureState.absolute;
    const delta = featureState.delta;

    // Raw scores for each emotion — driven by FACS-inspired rules
    const rawScores: ExpressionProbabilities = {
      happy: this.scoreHappy(abs, delta),
      sad: this.scoreSad(abs, delta),
      angry: this.scoreAngry(abs, delta),
      fear: this.scoreFear(abs, delta),
      disgust: this.scoreDisgust(abs, delta),
      surprise: this.scoreSurprise(abs, delta),
      neutral: this.scoreNeutral(abs, delta),
    };

    // Softmax normalization with calibrated temperature (0.55) for crisp, responsive probabilities
    return this.softmax(rawScores, 0.55);
  }

  // ─── Emotion Scoring Rules (FACS-Grounded) ─────────────────────────────────

  /**
   * Happy: AU6 (cheek raise / eye squint) + AU12 (lip corner pull / smile)
   */
  private scoreHappy(abs: ExpressionVector, delta: ExpressionVector): number {
    const smileAvg = (abs.mouthSmileLeft + abs.mouthSmileRight) / 2;
    const squintAvg = (abs.eyeSquintLeft + abs.eyeSquintRight) / 2;
    const frownAvg = (abs.mouthFrownLeft + abs.mouthFrownRight) / 2;

    let score = smileAvg * 3.4;
    score += squintAvg * 1.0;
    score -= frownAvg * 1.8;

    const smileDelta = (delta.mouthSmileLeft + delta.mouthSmileRight) / 2;
    if (smileDelta > 0.03) score += smileDelta * 1.5;

    return Math.max(0, score);
  }

  /**
   * Sad: AU1 (inner brow raise) + AU4 (brow lowerer) + AU15 (lip corner depressor)
   */
  private scoreSad(abs: ExpressionVector, delta: ExpressionVector): number {
    const frownAvg = (abs.mouthFrownLeft + abs.mouthFrownRight) / 2;
    const smileAvg = (abs.mouthSmileLeft + abs.mouthSmileRight) / 2;
    const browDown = (abs.browDownLeft + abs.browDownRight) / 2;

    let score = frownAvg * 3.0;
    score += abs.browInnerUp * 1.4;
    score += browDown * 0.8;
    score -= smileAvg * 2.0;

    const frownDelta = (delta.mouthFrownLeft + delta.mouthFrownRight) / 2;
    if (frownDelta > 0.03) score += frownDelta * 1.5;

    if (abs.headPitch < -0.08) score += Math.min(0.4, Math.abs(abs.headPitch) * 0.6);

    return Math.max(0, score);
  }

  /**
   * Angry: AU4 (brow lowerer) + AU5 (upper lid raiser) + AU23/24 (lip tightener/presser)
   */
  private scoreAngry(abs: ExpressionVector, delta: ExpressionVector): number {
    const browDown = (abs.browDownLeft + abs.browDownRight) / 2;
    const frownAvg = (abs.mouthFrownLeft + abs.mouthFrownRight) / 2;
    const smileAvg = (abs.mouthSmileLeft + abs.mouthSmileRight) / 2;

    let score = browDown * 3.2;
    score += frownAvg * 1.4;
    score += abs.mouthPucker * 0.8;
    score -= smileAvg * 2.0;
    score -= abs.browInnerUp * 1.0;

    if (abs.jawOpen < 0.15 && browDown > 0.25) score += 0.5;

    return Math.max(0, score);
  }

  /**
   * Fear: AU1+2 (brow raise) + AU4 (brow lowerer) + AU5 (upper lid raiser) + AU20 (lip stretcher)
   */
  private scoreFear(abs: ExpressionVector, delta: ExpressionVector): number {
    const browOuterUp = (abs.browOuterUpLeft + abs.browOuterUpRight) / 2;
    const eyeWide = (abs.eyeWideLeft + abs.eyeWideRight) / 2;

    let score = abs.browInnerUp * 1.8;
    score += browOuterUp * 1.4;
    score += eyeWide * 2.0;
    score += abs.mouthOpen * 0.8;

    const browDown = (abs.browDownLeft + abs.browDownRight) / 2;
    score += browDown * 0.5;

    const smileAvg = (abs.mouthSmileLeft + abs.mouthSmileRight) / 2;
    score -= smileAvg * 1.5;

    return Math.max(0, score);
  }

  /**
   * Disgust: AU9 (nose wrinkler) + AU15 (lip corner depressor) + AU25 (lips part)
   */
  private scoreDisgust(abs: ExpressionVector, delta: ExpressionVector): number {
    const frownAvg = (abs.mouthFrownLeft + abs.mouthFrownRight) / 2;
    const browDown = (abs.browDownLeft + abs.browDownRight) / 2;
    const smileAvg = (abs.mouthSmileLeft + abs.mouthSmileRight) / 2;

    let score = frownAvg * 2.2;
    score += browDown * 1.0;
    score += abs.mouthPucker * 0.6;

    const frownAsymmetry = Math.abs(abs.mouthFrownLeft - abs.mouthFrownRight);
    score += frownAsymmetry * 0.8;
    score -= smileAvg * 1.5;

    if (abs.jawOpen < 0.2 && frownAvg > 0.15) score += 0.3;

    return Math.max(0, score);
  }

  /**
   * Surprise: AU1+2 (brow raise) + AU5 (upper lid raiser) + AU26/27 (jaw drop)
   */
  private scoreSurprise(abs: ExpressionVector, delta: ExpressionVector): number {
    const browOuterUp = (abs.browOuterUpLeft + abs.browOuterUpRight) / 2;
    const eyeWide = (abs.eyeWideLeft + abs.eyeWideRight) / 2;

    let score = abs.browInnerUp * 1.6;
    score += browOuterUp * 2.0;
    score += eyeWide * 2.2;
    score += abs.jawOpen * 2.5;
    score += abs.mouthOpen * 1.4;

    const browDown = (abs.browDownLeft + abs.browDownRight) / 2;
    score -= browDown * 1.5;

    if (delta.jawOpen > 0.06) score += delta.jawOpen * 2.0;

    return Math.max(0, score);
  }

  /**
   * Neutral: resting face baseline.
   * High baseline that drops sharply whenever any active expression is detected.
   */
  private scoreNeutral(abs: ExpressionVector, delta: ExpressionVector): number {
    let score = 0.95;

    const smileAvg = (abs.mouthSmileLeft + abs.mouthSmileRight) / 2;
    const frownAvg = (abs.mouthFrownLeft + abs.mouthFrownRight) / 2;
    const browDown = (abs.browDownLeft + abs.browDownRight) / 2;
    const browOuterUp = (abs.browOuterUpLeft + abs.browOuterUpRight) / 2;
    const eyeWide = (abs.eyeWideLeft + abs.eyeWideRight) / 2;

    score -= smileAvg * 2.8;
    score -= frownAvg * 2.4;
    score -= abs.browInnerUp * 1.6;
    score -= browDown * 1.6;
    score -= browOuterUp * 1.8;
    score -= eyeWide * 1.8;
    score -= abs.jawOpen * 2.2;
    score -= abs.mouthOpen * 1.5;
    score -= abs.mouthPucker * 0.8;

    const totalDelta = Math.abs(delta.mouthSmileLeft) + Math.abs(delta.mouthSmileRight) +
      Math.abs(delta.mouthFrownLeft) + Math.abs(delta.mouthFrownRight) +
      Math.abs(delta.browInnerUp) + Math.abs(delta.jawOpen);
    score -= totalDelta * 1.0;

    return Math.max(0.02, score);
  }

  // ─── Utility ───────────────────────────────────────────────────────────────

  /**
   * Temperature-scaled softmax to convert raw scores to probabilities.
   * Temperature = 0.55 gives responsive, natural probabilities.
   */
  private softmax(scores: ExpressionProbabilities, temperature = 0.55): ExpressionProbabilities {
    const keys = Object.keys(scores) as (keyof ExpressionProbabilities)[];
    const maxScore = Math.max(...keys.map(k => scores[k]));

    const expScores: Record<string, number> = {};
    let sumExp = 0;
    for (const key of keys) {
      const exp = Math.exp((scores[key] - maxScore) / temperature);
      expScores[key] = exp;
      sumExp += exp;
    }

    const result: ExpressionProbabilities = {
      happy: 0, sad: 0, angry: 0, fear: 0, disgust: 0, surprise: 0, neutral: 0,
    };
    for (const key of keys) {
      result[key] = sumExp > 0 ? expScores[key] / sumExp : 1 / 7;
    }
    return result;
  }
}
