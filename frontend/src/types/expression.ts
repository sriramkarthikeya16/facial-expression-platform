/**
 * MoodLens - Expression and Real-time Inference Types
 * Grounded in shared/ schemas and contracts.
 */
import { 
  Emotion, 
  SystemState, 
  ExpressionState, 
  TrackingState, 
  BoundingBox, 
  FacialFeatures, 
  ExpressionProbabilities, 
  CandidateFace,
  ExpressionVector,
  ExpressionFeatureState,
  FaceQualityMetrics,
  CalibrationState,
  EXPRESSION_VECTOR_KEYS,
} from '../../../shared/schemas/expression';

export type { 
  Emotion, 
  SystemState, 
  ExpressionState, 
  TrackingState, 
  BoundingBox, 
  FacialFeatures, 
  ExpressionProbabilities, 
  CandidateFace,
  ExpressionVector,
  ExpressionFeatureState,
  FaceQualityMetrics,
  CalibrationState,
};

export { EXPRESSION_VECTOR_KEYS };

// Aliases for backwards compatibility with legacy UI components
export type PrimaryExpression = Emotion;
export type SystemExpressionState = SystemState;

export interface FaceDetectionResult {
  detected: boolean;
  box?: BoundingBox;
  landmarks?: Array<{ x: number; y: number }>;
  landmarks3d?: Array<{ x: number; y: number; z: number }>;
  blendShapes?: Map<string, number>;
  facialTransformationMatrix?: number[];
  features?: FacialFeatures;
  qualityScore: number;
  trackingConfidence: number;
  faceCount: number;
  candidates?: CandidateFace[];
  trackingState?: TrackingState;
  activeDetector?: 'Native' | 'MediaPipe' | 'LandmarkDetector' | 'StructuralCV' | 'None';
}

export interface RawInferenceResult {
  probabilities: ExpressionProbabilities;
  topExpression: PrimaryExpression;
  confidence: number;
  qualityScore: number;
  trackingConfidence: number;
  latencyMs: number;
}

export interface SmoothedExpressionResult {
  expression: ExpressionState;
  trackingState: TrackingState;
  confidence: number;
  rawConfidence: number;
  probabilities: ExpressionProbabilities;
  durationSeconds: number;
  qualityScore: number;
  isStable: boolean;
  timestamp: number;
}

export interface LiveStreamEvent {
  id: string;
  timestamp: number;
  expression: ExpressionState;
  confidence: number;
  probabilities: ExpressionProbabilities;
  durationSeconds: number;
  trackingState?: TrackingState;
  suggestion?: SuggestionAction | null;
}

import { SuggestionCategory } from '../../../shared/schemas/suggestion';

export interface SuggestionAction {
  id: string;
  ruleId: string;
  category: SuggestionCategory;
  title: string;
  message: string;
  expressionTrigger: ExpressionState;
  confidence: number;
  actionType: string;
  actionData?: Record<string, any>;
  requiresConfirmation: boolean;
  expiresInSeconds: number;
  createdAt: number;
}

export const EXPRESSION_DISPLAY_CONFIG: Record<
  ExpressionState,
  { label: string; emoji: string; color: string; badgeBg: string; textColor: string }
> = {
  happy: {
    label: 'Happy',
    emoji: '😊',
    color: '#10B981',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  sad: {
    label: 'Sad',
    emoji: '😢',
    color: '#3B82F6',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  angry: {
    label: 'Angry',
    emoji: '😠',
    color: '#EF4444',
    badgeBg: 'bg-red-500/10 dark:bg-red-500/20',
    textColor: 'text-red-600 dark:text-red-400',
  },
  fear: {
    label: 'Fear',
    emoji: '😨',
    color: '#8B5CF6',
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    textColor: 'text-purple-600 dark:text-purple-400',
  },
  disgust: {
    label: 'Disgust',
    emoji: '🤢',
    color: '#F59E0B',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  surprise: {
    label: 'Surprise',
    emoji: '😲',
    color: '#EC4899',
    badgeBg: 'bg-pink-500/10 dark:bg-pink-500/20',
    textColor: 'text-pink-600 dark:text-pink-400',
  },
  neutral: {
    label: 'Neutral',
    emoji: '😐',
    color: '#6B7280',
    badgeBg: 'bg-gray-500/10 dark:bg-gray-500/20',
    textColor: 'text-gray-600 dark:text-gray-400',
  },
  occluded: {
    label: 'Occluded',
    emoji: '👁️',
    color: '#F97316',
    badgeBg: 'bg-orange-500/10 dark:bg-orange-500/20',
    textColor: 'text-orange-600 dark:text-orange-400',
  },
  no_face: {
    label: 'No Face',
    emoji: '📵',
    color: '#64748B',
    badgeBg: 'bg-slate-500/10 dark:bg-slate-500/20',
    textColor: 'text-slate-500 dark:text-slate-400',
  },
  multi_face_warning: {
    label: 'Multiple Faces',
    emoji: '👥',
    color: '#EAB308',
    badgeBg: 'bg-yellow-500/10 dark:bg-yellow-500/20',
    textColor: 'text-yellow-600 dark:text-yellow-400',
  },
};
