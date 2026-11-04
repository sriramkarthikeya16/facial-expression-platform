/**
 * MoodLens — Confidence-Aware Fusion Classifier
 *
 * Combines CNN branch (image-based) and Landmark branch (expression vector-based)
 * into a single fused probability distribution.
 *
 * Fusion weights are DYNAMIC — adjusted by FaceQualityMetrics rather than
 * permanently hard-coded at 65/35.
 *
 * Phase 1: Weighted late fusion of two independent probability vectors.
 * Phase 2 (future): True dual-head ONNX model with learned concatenation.
 */
import {
  ExpressionProbabilities,
  ExpressionFeatureState,
  FaceQualityMetrics,
  Emotion,
} from '../types/expression';
import { LandmarkScorer } from './landmarkScorer';
import { THRESHOLDS } from '../../../shared/configuration/thresholds';

const CLASS_NAMES: Emotion[] = [
  'happy', 'sad', 'angry', 'fear', 'disgust', 'surprise', 'neutral',
];

export interface FusionResult {
  /** Fused probability distribution */
  probabilities: ExpressionProbabilities;
  /** Top expression from fused probabilities */
  topExpression: Emotion;
  /** Confidence of the top expression */
  confidence: number;
  /** The fusion weights that were used */
  fusionWeights: { cnnWeight: number; landmarkWeight: number };
  /** Individual branch outputs for debug display */
  branchOutputs: {
    cnn: ExpressionProbabilities;
    landmark: ExpressionProbabilities;
  };
}

export class FusionClassifier {
  private landmarkScorer: LandmarkScorer;

  constructor() {
    this.landmarkScorer = new LandmarkScorer();
  }

  /**
   * Fuse CNN and landmark branch outputs using quality-aware weights.
   *
   * @param cnnProbabilities - Probabilities from the CNN (ONNX) branch
   * @param featureState - Expression feature state (absolute + delta vectors)
   * @param quality - Face quality metrics that drive dynamic fusion weights
   * @returns Fused result with probabilities, top expression, and diagnostics
   */
  public fuse(
    cnnProbabilities: ExpressionProbabilities | null,
    featureState: ExpressionFeatureState | null,
    quality: FaceQualityMetrics | null
  ): FusionResult {
    // Score the landmark branch
    const landmarkProbs = featureState
      ? this.landmarkScorer.score(featureState)
      : this.uniformProbs();

    // If CNN is not available, use landmarks only
    const cnnProbs = cnnProbabilities ?? this.uniformProbs();

    // Check if landmark branch has active data
    const hasActiveLandmarks = Boolean(
      featureState &&
      (quality?.landmarkConfidence ?? 0) > 0.3 &&
      (
        featureState.absolute.mouthSmileLeft > 0 ||
        featureState.absolute.mouthFrownLeft > 0 ||
        featureState.absolute.jawOpen > 0 ||
        featureState.absolute.eyeBlinkLeft > 0 ||
        featureState.absolute.browInnerUp > 0 ||
        featureState.absolute.headPitch !== 0 ||
        featureState.absolute.headYaw !== 0
      )
    );

    // Compute dynamic fusion weights from quality
    const fusionWeights = this.computeFusionWeights(quality, cnnProbabilities !== null, hasActiveLandmarks);

    // Weighted combination
    const fused: ExpressionProbabilities = {
      happy: 0, sad: 0, angry: 0, fear: 0, disgust: 0, surprise: 0, neutral: 0,
    };

    for (const cls of CLASS_NAMES) {
      fused[cls] = fusionWeights.cnnWeight * cnnProbs[cls] +
                   fusionWeights.landmarkWeight * landmarkProbs[cls];
    }

    // Renormalize (should already sum to ~1.0 but safety)
    const sum = CLASS_NAMES.reduce((acc, cls) => acc + fused[cls], 0);
    if (sum > 0) {
      for (const cls of CLASS_NAMES) {
        fused[cls] /= sum;
      }
    }

    // Find top expression
    let topExpr: Emotion = 'neutral';
    let maxProb = 0;
    for (const cls of CLASS_NAMES) {
      if (fused[cls] > maxProb) {
        maxProb = fused[cls];
        topExpr = cls;
      }
    }

    return {
      probabilities: fused,
      topExpression: topExpr,
      confidence: maxProb,
      fusionWeights,
      branchOutputs: {
        cnn: cnnProbs,
        landmark: landmarkProbs,
      },
    };
  }

  /**
   * Compute dynamic fusion weights based on face quality.
   *
   * Quality-aware rules:
   * - Good quality: use base weights (CNN=0.65, Landmark=0.35)
   * - Partial occlusion: increase landmark weight (landmarks more reliable)
   * - Poor landmarks (extreme rotation): increase CNN weight
   * - Very blurry: both degraded, equalize
   * - One branch unavailable: give all weight to the other
   */
  private computeFusionWeights(
    quality: FaceQualityMetrics | null,
    hasCNN: boolean,
    hasLandmarks: boolean
  ): { cnnWeight: number; landmarkWeight: number } {
    // If only one branch available, use it entirely
    if (!hasCNN && !hasLandmarks) return { cnnWeight: 0.5, landmarkWeight: 0.5 };
    if (!hasCNN) return { cnnWeight: 0, landmarkWeight: 1.0 };
    if (!hasLandmarks) return { cnnWeight: 1.0, landmarkWeight: 0 };

    // Default base weights
    let cnnW: number = THRESHOLDS.FUSION_WEIGHT_CNN_BASE;
    let landW: number = THRESHOLDS.FUSION_WEIGHT_LANDMARKS_BASE;

    if (quality) {
      // ── Adjust for face quality ──

      // Low landmark confidence → reduce landmark trust
      if (quality.landmarkConfidence < 0.5) {
        const reduction = (0.5 - quality.landmarkConfidence) * 0.5;
        landW -= reduction;
        cnnW += reduction;
      }

      // Extreme head rotation → landmarks become less reliable for some features
      const rotationPenalty = Math.max(0,
        (quality.absYaw - THRESHOLDS.QUALITY_MAX_YAW_RAD) * 0.3 +
        (quality.absPitch - THRESHOLDS.QUALITY_MAX_PITCH_RAD) * 0.3
      );
      if (rotationPenalty > 0) {
        landW -= rotationPenalty;
        cnnW += rotationPenalty;
      }

      // High blur → CNN degrades, landmarks relatively more stable
      if (quality.blur > THRESHOLDS.QUALITY_BLUR_THRESHOLD) {
        const blurShift = (quality.blur - THRESHOLDS.QUALITY_BLUR_THRESHOLD) * 0.4;
        cnnW -= blurShift;
        landW += blurShift;
      }

      // Partial occlusion → CNN may see occluder, landmarks still partially usable
      if (quality.occlusion > 0.3) {
        const occlusionShift = quality.occlusion * 0.25;
        cnnW -= occlusionShift;
        landW += occlusionShift;
      }

      // Very small face → both degrade but CNN more so (less pixel info)
      if (quality.faceSize < THRESHOLDS.QUALITY_MIN_FACE_SIZE * 2) {
        const sizeShift = (THRESHOLDS.QUALITY_MIN_FACE_SIZE * 2 - quality.faceSize) * 2;
        cnnW -= sizeShift * 0.15;
        landW += sizeShift * 0.15;
      }

      // Bad brightness → CNN degrades
      if (quality.brightness < THRESHOLDS.QUALITY_MIN_BRIGHTNESS ||
          quality.brightness > THRESHOLDS.QUALITY_MAX_BRIGHTNESS) {
        cnnW -= 0.08;
        landW += 0.08;
      }
    }

    // Clamp to configured min/max
    cnnW = Math.max(THRESHOLDS.FUSION_WEIGHT_MIN, Math.min(THRESHOLDS.FUSION_WEIGHT_MAX, cnnW));
    landW = Math.max(THRESHOLDS.FUSION_WEIGHT_MIN, Math.min(THRESHOLDS.FUSION_WEIGHT_MAX, landW));

    // Renormalize to sum to 1.0
    const total = cnnW + landW;
    return {
      cnnWeight: cnnW / total,
      landmarkWeight: landW / total,
    };
  }

  /** Uniform probability distribution (fallback) */
  private uniformProbs(): ExpressionProbabilities {
    return {
      happy: 1 / 7, sad: 1 / 7, angry: 1 / 7, fear: 1 / 7,
      disgust: 1 / 7, surprise: 1 / 7, neutral: 1 / 7,
    };
  }
}
