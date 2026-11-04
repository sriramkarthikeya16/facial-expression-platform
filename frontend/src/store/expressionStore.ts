/**
 * MoodLens - Real-Time Expression Zustand Store
 * Grounded in shared contracts.
 */
import { create } from 'zustand';
import { 
  ExpressionState, 
  TrackingState,
  ExpressionProbabilities, 
  BoundingBox, 
  SuggestionAction,
  LiveStreamEvent,
  ExpressionVector,
  CalibrationState,
  FaceQualityMetrics,
} from '../types/expression';
import { SafetyLevel, ActionResult } from '../../../shared/schemas/action';
import { SuggestionEngine } from '../ml/suggestionEngine';

const DEFAULT_PROBABILITIES: ExpressionProbabilities = {
  happy: 0,
  sad: 0,
  angry: 0,
  fear: 0,
  disgust: 0,
  surprise: 0,
  neutral: 0,
};

interface ExpressionHistoryPoint {
  timestamp: number;
  expression: ExpressionState;
  confidence: number;
  quality: number;
}

interface ExpressionStoreState {
  // Current real-time state
  currentExpression: ExpressionState;
  trackingState: TrackingState;
  confidence: number;
  rawConfidence: number;
  probabilities: ExpressionProbabilities;
  durationSeconds: number;
  qualityScore: number;
  trackingConfidence: number;
  boundingBox: BoundingBox | null;
  inferenceLatencyMs: number;
  isFacePresent: boolean;

  // Pipeline Diagnostics (User-requested diagnostic instrumentation)
  detectorName: string;
  videoResolution: string;
  faceCount: number;
  rawTopExpression: string;
  cropDimensions: string;
  cameraStatus: string;

  // ── Apple-Style Pipeline State ──
  /** Current ARKit-inspired expression vector (21 coefficients) */
  expressionVector: ExpressionVector | null;
  /** Neutral baseline expression vector (null until calibrated) */
  neutralBaseline: ExpressionVector | null;
  /** Calibration progress and state */
  calibrationState: CalibrationState;
  calibrationProgress: number;
  /** Face quality metrics for debug panel */
  faceQualityMetrics: FaceQualityMetrics | null;
  /** Current fusion weights for debug panel */
  fusionWeights: { cnnWeight: number; landmarkWeight: number } | null;
  /** Branch-level probabilities for debug panel */
  branchOutputs: {
    cnn: ExpressionProbabilities;
    landmark: ExpressionProbabilities;
  } | null;

  // Safety level & Modal
  safetyLevel: SafetyLevel;
  isSafetyModalOpen: boolean;

  // Active suggestions & alerts
  activeSuggestions: SuggestionAction[];
  
  // Interactive Modal Trigger
  activeModal: 'wellness' | 'notes' | 'game' | 'messaging' | 'meditation' | null;
  setActiveModal: (modal: 'wellness' | 'notes' | 'game' | 'messaging' | 'meditation' | null) => void;
  executeAction: (suggestion: SuggestionAction) => Promise<ActionResult>;
  
  // Real-time timeline history (last 60 samples for live charts)
  recentHistory: ExpressionHistoryPoint[];

  // Live Expression Stream Feed (captured every 3-5 seconds)
  detectionInterval: number;
  streamEvents: LiveStreamEvent[];

  // Actions
  updateExpressionState: (
    expression: ExpressionState,
    trackingState: TrackingState,
    confidence: number,
    rawConfidence: number,
    probabilities: ExpressionProbabilities,
    durationSeconds: number,
    qualityScore: number,
    trackingConfidence: number,
    boundingBox: BoundingBox | null,
    latencyMs: number,
    isFacePresent: boolean,
    diagnostics?: {
      detectorName?: string;
      videoResolution?: string;
      faceCount?: number;
      rawTopExpression?: string;
      cropDimensions?: string;
      cameraStatus?: string;
    }
  ) => void;
  /** Update Apple-pipeline specific state */
  updatePipelineState: (state: {
    expressionVector?: ExpressionVector | null;
    neutralBaseline?: ExpressionVector | null;
    calibrationState?: CalibrationState;
    calibrationProgress?: number;
    faceQualityMetrics?: FaceQualityMetrics | null;
    fusionWeights?: { cnnWeight: number; landmarkWeight: number } | null;
    branchOutputs?: { cnn: ExpressionProbabilities; landmark: ExpressionProbabilities } | null;
  }) => void;
  setSafetyModalOpen: (open: boolean) => void;
  triggerUserSOS: () => void;
  addStreamEvent: (event: LiveStreamEvent) => void;
  clearStreamEvents: () => void;
  setDetectionInterval: (interval: number) => void;
  addSuggestion: (suggestion: SuggestionAction) => void;
  removeSuggestion: (id: string) => void;
  clearSuggestions: () => void;
  reset: () => void;
}

export const useExpressionStore = create<ExpressionStoreState>((set) => ({
  currentExpression: 'no_face',
  trackingState: 'UNKNOWN',
  confidence: 0,
  rawConfidence: 0,
  probabilities: DEFAULT_PROBABILITIES,
  durationSeconds: 0,
  qualityScore: 0,
  trackingConfidence: 0,
  boundingBox: null,
  inferenceLatencyMs: 0,
  isFacePresent: false,

  detectorName: 'None',
  videoResolution: '0 × 0',
  faceCount: 0,
  rawTopExpression: 'neutral',
  cropDimensions: '112 × 112',
  cameraStatus: 'STARTING',

  // Apple-pipeline defaults
  expressionVector: null,
  neutralBaseline: null,
  calibrationState: 'idle',
  calibrationProgress: 0,
  faceQualityMetrics: null,
  fusionWeights: null,
  branchOutputs: null,

  safetyLevel: 0,
  isSafetyModalOpen: false,
  activeSuggestions: [],
  activeModal: null,
  recentHistory: [],
  detectionInterval: 4,
  streamEvents: [],

  updateExpressionState: (
    expression,
    trackingState,
    confidence,
    rawConfidence,
    probabilities,
    durationSeconds,
    qualityScore,
    trackingConfidence,
    boundingBox,
    latencyMs,
    isFacePresent,
    diagnostics
  ) => {
    set((state) => {
      const newPoint: ExpressionHistoryPoint = {
        timestamp: Date.now(),
        expression,
        confidence,
        quality: qualityScore,
      };

      const recentHistory = [...state.recentHistory, newPoint].slice(-60);

      // Evaluate Safety Level
      // Principle: Never treat facial expression alone as an emergency signal (Level 5).
      // Expressions map strictly to non-emergency wellness levels (e.g. 1-3).
      // Level 5 emergency modal is strictly reserved for explicit user SOS request.
      let safetyLevel: SafetyLevel = state.safetyLevel === 5 ? 5 : 0;
      let shouldOpenSafetyModal = state.isSafetyModalOpen;

      if (expression === 'fear' && confidence >= 0.70 && durationSeconds >= 5.0) {
        safetyLevel = Math.max(safetyLevel, 2) as SafetyLevel; // Mindful grounding level
      } else if (expression === 'sad' && confidence >= 0.70 && durationSeconds >= 6.0) {
        safetyLevel = Math.max(safetyLevel, 2) as SafetyLevel;
      } else if (expression === 'angry' && confidence >= 0.70 && durationSeconds >= 5.0) {
        safetyLevel = Math.max(safetyLevel, 3) as SafetyLevel;
      }

      return {
        currentExpression: expression,
        trackingState,
        confidence,
        rawConfidence,
        probabilities,
        durationSeconds,
        qualityScore,
        trackingConfidence,
        boundingBox,
        inferenceLatencyMs: latencyMs,
        isFacePresent,
        detectorName: diagnostics?.detectorName ?? state.detectorName,
        videoResolution: diagnostics?.videoResolution ?? state.videoResolution,
        faceCount: diagnostics?.faceCount ?? state.faceCount,
        rawTopExpression: diagnostics?.rawTopExpression ?? state.rawTopExpression,
        cropDimensions: diagnostics?.cropDimensions ?? state.cropDimensions,
        cameraStatus: diagnostics?.cameraStatus ?? (isFacePresent ? 'READY' : state.cameraStatus),
        safetyLevel,
        isSafetyModalOpen: shouldOpenSafetyModal,
        recentHistory,
      };
    });
  },

  updatePipelineState: (pipelineState) => {
    set((state) => ({
      ...state,
      ...(pipelineState.expressionVector !== undefined && { expressionVector: pipelineState.expressionVector }),
      ...(pipelineState.neutralBaseline !== undefined && { neutralBaseline: pipelineState.neutralBaseline }),
      ...(pipelineState.calibrationState !== undefined && { calibrationState: pipelineState.calibrationState }),
      ...(pipelineState.calibrationProgress !== undefined && { calibrationProgress: pipelineState.calibrationProgress }),
      ...(pipelineState.faceQualityMetrics !== undefined && { faceQualityMetrics: pipelineState.faceQualityMetrics }),
      ...(pipelineState.fusionWeights !== undefined && { fusionWeights: pipelineState.fusionWeights }),
      ...(pipelineState.branchOutputs !== undefined && { branchOutputs: pipelineState.branchOutputs }),
    }));
  },

  setSafetyModalOpen: (open) => {
    set((state) => ({
      isSafetyModalOpen: open,
      safetyLevel: open ? state.safetyLevel : (state.safetyLevel === 5 ? 0 : state.safetyLevel),
    }));
  },

  triggerUserSOS: () => {
    set({
      safetyLevel: 5,
      isSafetyModalOpen: true,
    });
  },

  addStreamEvent: (event) => {
    set((state) => ({
      streamEvents: [event, ...state.streamEvents].slice(0, 25),
    }));
  },

  clearStreamEvents: () => {
    set({ streamEvents: [] });
  },

  setDetectionInterval: (interval) => {
    set({ detectionInterval: interval });
  },

  addSuggestion: (suggestion) => {
    set((state) => {
      const remaining = state.activeSuggestions.filter(
        (s) => s.id !== suggestion.id && s.ruleId !== suggestion.ruleId
      );
      return {
        activeSuggestions: [suggestion, ...remaining].slice(0, 3),
      };
    });
  },

  setActiveModal: (modal) => {
    set({ activeModal: modal });
  },

  executeAction: async (suggestion) => {
    // 1. Remove from active suggestions list
    set((state) => ({
      activeSuggestions: state.activeSuggestions.filter((s) => s.id !== suggestion.id),
    }));

    // 2. Open interactive modal for guided flows
    if (suggestion.actionType === 'breathing_exercise') {
      set({ activeModal: 'wellness' });
    } else if (suggestion.actionType === 'open_notes') {
      set({ activeModal: 'notes' });
    } else if (suggestion.actionType === 'open_game') {
      set({ activeModal: 'game' });
    } else if (suggestion.actionType === 'open_messaging') {
      set({ activeModal: 'messaging' });
    } else if (
      suggestion.actionType === 'open_meditation' ||
      suggestion.actionType === 'grounding_exercise'
    ) {
      set({ activeModal: 'meditation' });
    }

    // 3. Dispatch to SuggestionEngine for web links/phone/spotify
    const engine = new SuggestionEngine();
    return await engine.executeAction({
      action_id: suggestion.id,
      action_token: `act_tok_${Date.now()}`,
      action_type: suggestion.actionType,
      confirmed_by_user: true,
      confirmed_at: Date.now(),
      payload: suggestion.actionData,
    });
  },

  removeSuggestion: (id) => {
    set((state) => ({
      activeSuggestions: state.activeSuggestions.filter((s) => s.id !== id),
    }));
  },

  clearSuggestions: () => {
    set({ activeSuggestions: [] });
  },

  reset: () => {
    set({
      currentExpression: 'no_face',
      trackingState: 'UNKNOWN',
      confidence: 0,
      rawConfidence: 0,
      probabilities: DEFAULT_PROBABILITIES,
      durationSeconds: 0,
      qualityScore: 0,
      trackingConfidence: 0,
      boundingBox: null,
      inferenceLatencyMs: 0,
      isFacePresent: false,
      safetyLevel: 0,
      isSafetyModalOpen: false,
      activeSuggestions: [],
      activeModal: null,
      recentHistory: [],
      streamEvents: [],
      expressionVector: null,
      neutralBaseline: null,
      calibrationState: 'idle',
      calibrationProgress: 0,
      faceQualityMetrics: null,
      fusionWeights: null,
      branchOutputs: null,
    });
  },
}));
