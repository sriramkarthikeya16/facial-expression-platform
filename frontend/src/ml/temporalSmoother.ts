/**
 * MoodLens - Temporal Smoother & State Machine
 * Applies Exponential Moving Average (EMA), Rolling Window Voting, Hysteresis, and coordinates with CV Tracking State Machine.
 */
import { 
  ExpressionState, 
  ExpressionProbabilities, 
  RawInferenceResult, 
  SmoothedExpressionResult,
  PrimaryExpression,
  TrackingState
} from '../types/expression';
import { CVStateMachine, CVStateOutput } from './cvStateMachine';
import { THRESHOLDS } from '../../../shared/configuration/thresholds';

const ALL_CLASSES: PrimaryExpression[] = [
  'happy',
  'sad',
  'angry',
  'fear',
  'disgust',
  'surprise',
  'neutral',
];

interface HistoryEntry {
  expression: PrimaryExpression;
  confidence: number;
  probabilities: ExpressionProbabilities;
}

export class TemporalSmoother {
  private alpha: number;
  private entryThreshold: number;
  private exitThreshold: number;
  private cvStateMachine: CVStateMachine;

  private smoothedProbs: ExpressionProbabilities = {
    happy: 0,
    sad: 0,
    angry: 0,
    fear: 0,
    disgust: 0,
    surprise: 0,
    neutral: 0,
  };

  private currentState: ExpressionState = 'no_face';
  private stateStartTime: number = Date.now();
  private consecutiveFramesInState = 0;

  // Rolling window mode
  private historyBuffer: HistoryEntry[] = [];
  private readonly ROLLING_WINDOW_SIZE = 15;

  // Transition damping
  private readonly TRANSITION_DAMPING_FRAMES = 3;
  private pendingExpression: PrimaryExpression | null = null;
  private pendingFrameCount = 0;

  constructor(
    alpha = THRESHOLDS.EMA_ALPHA, 
    entryThreshold = THRESHOLDS.HYSTERESIS_ENTRY_THRESHOLD, 
    exitThreshold = THRESHOLDS.HYSTERESIS_EXIT_THRESHOLD
  ) {
    this.alpha = alpha;
    this.entryThreshold = entryThreshold;
    this.exitThreshold = exitThreshold;
    this.cvStateMachine = new CVStateMachine();
  }

  private getEmaAlpha(expr: PrimaryExpression): number {
    switch (expr) {
      case 'surprise': return THRESHOLDS.EMA_ALPHA_SURPRISE;
      case 'happy': return THRESHOLDS.EMA_ALPHA_HAPPY;
      case 'angry': return THRESHOLDS.EMA_ALPHA_ANGRY;
      case 'fear': return THRESHOLDS.EMA_ALPHA_FEAR;
      case 'sad': return THRESHOLDS.EMA_ALPHA_SAD;
      case 'neutral': return THRESHOLDS.EMA_ALPHA_NEUTRAL;
      case 'disgust': return THRESHOLDS.EMA_ALPHA_DISGUST;
      default: return this.alpha;
    }
  }

  public process(
    raw: RawInferenceResult,
    isFaceDetected: boolean,
    faceCount = 1
  ): SmoothedExpressionResult {
    const now = Date.now();

    // 1. Process CV Tracking State Machine
    const cvState: CVStateOutput = this.cvStateMachine.transition({
      isFaceDetected,
      qualityScore: raw.qualityScore,
      trackingConfidence: raw.trackingConfidence,
      faceCount,
    });

    // 2. Handle Multi-Face Warning
    if (cvState.isMultiFaceWarning) {
      if (this.currentState !== 'multi_face_warning') {
        this.currentState = 'multi_face_warning';
        this.stateStartTime = now;
        this.consecutiveFramesInState = 0;
        this.pendingExpression = null;
        this.pendingFrameCount = 0;
      }
      return {
        expression: 'multi_face_warning',
        trackingState: cvState.trackingState,
        confidence: 0,
        rawConfidence: raw.confidence,
        probabilities: { ...this.smoothedProbs },
        durationSeconds: (now - this.stateStartTime) / 1000,
        qualityScore: raw.qualityScore,
        isStable: false,
        timestamp: now,
      };
    }

    // 3. Handle Non-Usable CV Tracking States
    if (!cvState.isFaceUsableForInference) {
      const mappedExpressionState: ExpressionState = 
        cvState.trackingState === 'PARTIAL_OCCLUSION' ? 'occluded' : 'no_face';

      if (this.currentState !== mappedExpressionState) {
        this.currentState = mappedExpressionState;
        this.stateStartTime = now;
        this.consecutiveFramesInState = 0;
        this.pendingExpression = null;
        this.pendingFrameCount = 0;
      }

      const zeroProbs: ExpressionProbabilities = {
        happy: 0, sad: 0, angry: 0, fear: 0, disgust: 0, surprise: 0, neutral: 0,
      };
      this.smoothedProbs = { ...zeroProbs };
      this.historyBuffer = [];

      return {
        expression: mappedExpressionState,
        trackingState: cvState.trackingState,
        confidence: 0,
        rawConfidence: 0,
        probabilities: zeroProbs,
        durationSeconds: (now - this.stateStartTime) / 1000,
        qualityScore: raw.qualityScore,
        isStable: false,
        timestamp: now,
      };
    }

    // 4. Face is VISIBLE / REDETECTION - Apply Adaptive EMA
    const isFirstDetection = 
      this.currentState === 'no_face' || 
      this.currentState === 'occluded' || 
      this.currentState === 'multi_face_warning';

    const currentTopRaw = raw.topExpression || 'neutral';

    if (isFirstDetection) {
      for (const cls of ALL_CLASSES) {
        this.smoothedProbs[cls] = raw.probabilities[cls] || 0;
      }
    } else {
      const isShift = currentTopRaw !== this.currentState && raw.confidence > 0.35;
      const baseAlpha = this.getEmaAlpha(currentTopRaw);
      const currentAlpha = isShift ? Math.max(THRESHOLDS.EMA_ALPHA_FAST, baseAlpha) : baseAlpha;

      for (const cls of ALL_CLASSES) {
        const rawP = raw.probabilities[cls] || 0;
        this.smoothedProbs[cls] = currentAlpha * rawP + (1 - currentAlpha) * (this.smoothedProbs[cls] || 0);
      }
    }

    // Normalize
    const sumProbs = ALL_CLASSES.reduce((acc, cls) => acc + (this.smoothedProbs[cls] || 0), 0);
    if (sumProbs > 0) {
      for (const cls of ALL_CLASSES) {
        this.smoothedProbs[cls] = (this.smoothedProbs[cls] || 0) / sumProbs;
      }
    }

    // 5. Find smoothed top expression & confidence
    let topSmoothedExpr: PrimaryExpression = currentTopRaw;
    let maxSmoothedConfidence = 0;

    for (const cls of ALL_CLASSES) {
      if ((this.smoothedProbs[cls] || 0) > maxSmoothedConfidence) {
        maxSmoothedConfidence = this.smoothedProbs[cls];
        topSmoothedExpr = cls;
      }
    }

    // Rolling window update & vote
    this.historyBuffer.push({
      expression: topSmoothedExpr,
      confidence: maxSmoothedConfidence,
      probabilities: { ...this.smoothedProbs }
    });
    if (this.historyBuffer.length > this.ROLLING_WINDOW_SIZE) {
      this.historyBuffer.shift();
    }

    const windowVotes = {
      happy: 0, sad: 0, angry: 0, fear: 0, disgust: 0, surprise: 0, neutral: 0
    };
    
    this.historyBuffer.forEach((entry, idx) => {
      // Weight by recency (older = smaller weight, newer = larger weight)
      const weight = (idx + 1) * entry.confidence;
      windowVotes[entry.expression] += weight;
    });

    let windowVoteExpr: PrimaryExpression = topSmoothedExpr;
    let maxVote = -1;
    for (const cls of ALL_CLASSES) {
      if (windowVotes[cls] > maxVote) {
        maxVote = windowVotes[cls];
        windowVoteExpr = cls;
      }
    }

    // 6. Apply Hysteresis & Transition Damping
    let targetState: ExpressionState = this.currentState;

    if (isFirstDetection) {
      targetState = topSmoothedExpr;
      this.pendingExpression = null;
      this.pendingFrameCount = 0;
    } else {
      const currentProb = this.smoothedProbs[this.currentState as PrimaryExpression] || 0;
      const isNewExprDominant = maxSmoothedConfidence > currentProb + THRESHOLDS.HYSTERESIS_DOMINANCE_DELTA;
      const isCurrentDecayed = currentProb < this.exitThreshold;

      // Candidate expression considers both smoothed prob and window vote
      let candidateExpr = topSmoothedExpr;
      
      // If hysteresis allows a change
      if (topSmoothedExpr !== this.currentState && (isNewExprDominant || isCurrentDecayed)) {
        // If the window strongly disagrees, we might wait, but for now we require candidate to match 
        // across consecutive frames. We can use windowVoteExpr as our candidate if it differs.
        candidateExpr = windowVoteExpr;
      } else {
        candidateExpr = this.currentState as PrimaryExpression;
      }

      if (candidateExpr !== this.currentState) {
        if (candidateExpr === this.pendingExpression) {
          this.pendingFrameCount++;
        } else {
          this.pendingExpression = candidateExpr;
          this.pendingFrameCount = 1;
        }

        if (this.pendingFrameCount >= this.TRANSITION_DAMPING_FRAMES) {
          targetState = candidateExpr;
          this.pendingExpression = null;
          this.pendingFrameCount = 0;
        }
      } else {
        this.pendingExpression = null;
        this.pendingFrameCount = 0;
      }
    }

    // Update state duration and tracking
    if (targetState !== this.currentState) {
      this.currentState = targetState;
      this.stateStartTime = now;
      this.consecutiveFramesInState = 1;
    } else {
      this.consecutiveFramesInState++;
    }

    const durationSeconds = (now - this.stateStartTime) / 1000;
    const isStable = this.consecutiveFramesInState >= 4 && durationSeconds >= 0.5;

    return {
      expression: this.currentState,
      trackingState: cvState.trackingState,
      confidence: maxSmoothedConfidence,
      rawConfidence: raw.confidence,
      probabilities: { ...this.smoothedProbs },
      durationSeconds,
      qualityScore: raw.qualityScore,
      isStable,
      timestamp: now,
    };
  }

  public reset(): void {
    this.smoothedProbs = {
      happy: 0, sad: 0, angry: 0, fear: 0, disgust: 0, surprise: 0, neutral: 0,
    };
    this.currentState = 'no_face';
    this.stateStartTime = Date.now();
    this.consecutiveFramesInState = 0;
    
    this.historyBuffer = [];
    this.pendingExpression = null;
    this.pendingFrameCount = 0;

    this.cvStateMachine.reset();
  }
}
