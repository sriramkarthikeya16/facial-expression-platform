/**
 * MoodLens - Main Apple-Inspired Expression Pipeline Hook
 *
 * Architecture:
 *   WEBCAM (30 FPS)
 *      │
 *   InferenceScheduler (Camera 30 FPS / ML 15 FPS)
 *      │
 *      ▼
 *   Face Detection + 478 Landmarks (FaceDetector / LandmarkDetector)
 *      │
 *   ExpressionFeatureEngine (Landmarks + Native Blend Shapes + Head Pose)
 *      │
 *      ▼
 *   Unified ExpressionVector (ARKit-inspired 21 coefficients)
 *      │
 *   NeutralBaseline (Captures neutral face in first 2s, provides absolute + delta)
 *      │
 *   FaceQualityAssessor (Calculates landmark confidence, blur, head pose, occlusion)
 *      │
 *   Dual-Branch Inference:
 *     ├── Branch A: Aligned Face Crop (112x112) → CNN (ONNX MobileNetV3) → Probabilities
 *     └── Branch B: ExpressionFeatureState (40 features) → LandmarkScorer → Probabilities
 *      │
 *   Confidence-Aware Dynamic Fusion (FusionClassifier weights dynamically adjusted by FaceQuality)
 *      │
 *   Temporal Smoothing (Enhanced TemporalSmoother with EMA, 15-frame rolling window & damping)
 *      │
 *   Stable Expression State → UI Store + Pluggable Suggestion Engine
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { FaceDetector } from '../ml/faceDetector';
import { ExpressionClassifier, ModelSource } from '../ml/expressionClassifier';
import { ExpressionFeatureEngine } from '../ml/expressionFeatureEngine';
import { NeutralBaseline } from '../ml/neutralBaseline';
import { FaceQualityAssessor } from '../ml/faceQuality';
import { FusionClassifier } from '../ml/fusionClassifier';
import { TemporalSmoother } from '../ml/temporalSmoother';
import { SuggestionEngine } from '../ml/suggestionEngine';
import { InferenceScheduler } from '../ml/inferenceScheduler';
import { 
  ExpressionState, 
  ExpressionProbabilities, 
  RawInferenceResult,
} from '../types/expression';
import { useExpressionStore } from '../store/expressionStore';
import { useAuthStore } from '../store/authStore';
import { useSessionStore } from '../store/sessionStore';
import { useAccessibilityStore } from '../store/accessibilityStore';
import { popupSuggestionToast } from '../components/suggestions/SuggestionToast';

const EMOTION_STATES: ExpressionState[] = [
  'happy', 'sad', 'angry', 'fear', 'disgust', 'surprise', 'neutral',
];

interface UseExpressionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  fps?: number;
}

interface UseExpressionResult {
  modelSource: ModelSource;
  recalibrate: () => void;
}

interface WindowSample {
  expression: ExpressionState;
  confidence: number;
  probabilities: ExpressionProbabilities;
  durationSeconds: number;
}

export function useExpression({ videoRef, isActive }: UseExpressionOptions): UseExpressionResult {
  const detectorRef = useRef<FaceDetector>(new FaceDetector());
  const classifierRef = useRef<ExpressionClassifier>(new ExpressionClassifier());
  const featureEngineRef = useRef<ExpressionFeatureEngine>(new ExpressionFeatureEngine());
  const baselineRef = useRef<NeutralBaseline>(new NeutralBaseline());
  const qualityAssessorRef = useRef<FaceQualityAssessor>(new FaceQualityAssessor());
  const fusionClassifierRef = useRef<FusionClassifier>(new FusionClassifier());
  const smootherRef = useRef<TemporalSmoother>(new TemporalSmoother());
  const suggestionEngineRef = useRef<SuggestionEngine>(new SuggestionEngine());
  const schedulerRef = useRef<InferenceScheduler>(new InferenceScheduler());

  const prevExpressionRef = useRef<string>('neutral');
  const [modelSource, setModelSource] = useState<ModelSource>('heuristic_fallback');

  const updateExpressionState = useExpressionStore((s) => s.updateExpressionState);
  const updatePipelineState = useExpressionStore((s) => s.updatePipelineState);
  const addSuggestion = useExpressionStore((s) => s.addSuggestion);
  const addStreamEvent = useExpressionStore((s) => s.addStreamEvent);
  const detectionInterval = useExpressionStore((s) => s.detectionInterval);
  const preferences = useAuthStore((s) => s.preferences);
  const isSessionActive = useSessionStore((s) => s.isSessionActive);
  const addUncommittedEvent = useSessionStore((s) => s.addUncommittedEvent);
  const announceTransition = useAccessibilityStore((s) => s.announceTransition);

  const lastStreamSampleTime = useRef<number>(Date.now());
  const lastSuggestionCheckTime = useRef<number>(0);
  const lastDebugUpdateTime = useRef<number>(0);
  const windowSamplesRef = useRef<WindowSample[]>([]);

  // Initialize ONNX classifier on mount
  useEffect(() => {
    classifierRef.current.initialize().then(() => {
      setModelSource(classifierRef.current.getModelSource());
    });
  }, []);

  const runPipelineStep = useCallback(async (timestampMs: number) => {
    const video = videoRef.current;
    if (!video || !isActive || video.readyState < 2) {
      return;
    }

    try {
      // ── Step 1: Face & Landmark Detection (MediaPipe FaceLandmarker + 478 3D points) ──
      const detection = await detectorRef.current.detect(video);

      // Handle no face detected
      if (!detection.detected) {
        const zeroProbs: ExpressionProbabilities = {
          happy: 0,
          sad: 0,
          angry: 0,
          fear: 0,
          disgust: 0,
          surprise: 0,
          neutral: 0,
        };
        const rawNoFace: RawInferenceResult = {
          probabilities: zeroProbs,
          topExpression: 'neutral',
          confidence: 0,
          qualityScore: 0,
          trackingConfidence: 0,
          latencyMs: 0,
        };
        const smoothed = smootherRef.current.process(rawNoFace, false, 0);

        updateExpressionState(
          smoothed.expression,
          smoothed.trackingState,
          0,
          0,
          zeroProbs,
          smoothed.durationSeconds,
          0,
          0,
          null,
          0,
          false,
          {
            detectorName: detection.activeDetector || 'None',
            videoResolution: `${video.videoWidth} × ${video.videoHeight}`,
            faceCount: 0,
            rawTopExpression: 'none',
            cropDimensions: 'None',
            cameraStatus: 'READY',
          }
        );

        updatePipelineState({
          expressionVector: null,
          faceQualityMetrics: null,
          fusionWeights: null,
          branchOutputs: null,
        });
        return;
      }

      // ── Step 2: Extract Unified ARKit-inspired ExpressionVector ──
      const expressionVector = featureEngineRef.current.compute(
        detection.landmarks3d || [],
        detection.blendShapes || null,
        detection.facialTransformationMatrix || null
      );

      // ── Step 3: Neutral Baseline Calibration (first 2s of camera start) ──
      const baseline = baselineRef.current;
      if (baseline.getState() === 'calibrating') {
        baseline.addCalibrationFrame(expressionVector);
      }
      const featureState = baseline.computeFeatureState(expressionVector);

      // ── Step 4: Crop Face Tensor & Affine Alignment for CNN Branch ──
      let tensorData: Float32Array | null = null;
      let faceCropPixels: Uint8ClampedArray | null = null;
      let rollDeg = 0;

      if (detection.box) {
        const crop = detectorRef.current.cropFaceTensor(
          video,
          detection.box,
          112,
          detection.landmarks
        );
        if (crop) {
          tensorData = crop.tensor;
          faceCropPixels = crop.pixels;
          rollDeg = crop.rollAngleDeg;
        }
      }

      // ── Step 5: Face Quality Assessment ──
      const faceQuality = qualityAssessorRef.current.assess(
        detection.landmarks3d || null,
        detection.landmarks3d && detection.landmarks3d.length > 0 ? (detection.qualityScore || 0.95) : 0,
        {
          pitch: expressionVector.headPitch,
          yaw: expressionVector.headYaw,
          roll: expressionVector.headRoll,
        },
        detection.box
          ? {
              x: detection.box.x / video.videoWidth,
              y: detection.box.y / video.videoHeight,
              width: detection.box.width / video.videoWidth,
              height: detection.box.height / video.videoHeight,
            }
          : null,
        video.videoWidth,
        video.videoHeight,
        detection.trackingConfidence,
        faceCropPixels,
        112
      );

      // ── Step 6: Dual-Branch Inference & Dynamic Fusion ──
      // Branch A: CNN (ONNX Model)
      const rawCnn = await classifierRef.current.classify(
        tensorData,
        detection.qualityScore,
        detection.trackingConfidence
      );

      // Branch B: Landmark Scorer + Confidence-Aware Dynamic Fusion
      const fusionResult = fusionClassifierRef.current.fuse(
        rawCnn.probabilities,
        featureState,
        faceQuality
      );

      const rawFusedForSmoother: RawInferenceResult = {
        probabilities: fusionResult.probabilities,
        topExpression: fusionResult.topExpression,
        confidence: fusionResult.confidence,
        qualityScore: faceQuality.overallQuality,
        trackingConfidence: detection.trackingConfidence,
        latencyMs: rawCnn.latencyMs,
      };

      // ── Step 7: Temporal Smoothing (EMA + 15-frame Rolling Window + Transition Damping) ──
      const smoothed = smootherRef.current.process(rawFusedForSmoother, true, detection.faceCount);

      // ── Step 8: Update Global Stores ──
      updateExpressionState(
        smoothed.expression,
        smoothed.trackingState,
        smoothed.confidence,
        rawFusedForSmoother.confidence,
        smoothed.probabilities,
        smoothed.durationSeconds,
        smoothed.qualityScore,
        detection.trackingConfidence,
        detection.box || null,
        rawCnn.latencyMs,
        true,
        {
          detectorName: detection.activeDetector || 'LandmarkDetector',
          videoResolution: `${video.videoWidth} × ${video.videoHeight}`,
          faceCount: detection.faceCount,
          rawTopExpression: `${fusionResult.topExpression} (${Math.round(fusionResult.confidence * 100)}%)`,
          cropDimensions: Math.abs(rollDeg) > 2 ? `112 × 112 (Aligned ${rollDeg > 0 ? '+' : ''}${rollDeg}°)` : '112 × 112 (Aligned)',
          cameraStatus: 'READY',
        }
      );

      const now = Date.now();

      // Throttle heavy debug pipeline store updates to ~10 FPS to save main thread cycles
      if (now - lastDebugUpdateTime.current >= 100) {
        lastDebugUpdateTime.current = now;
        updatePipelineState({
          expressionVector,
          neutralBaseline: baseline.getBaseline(),
          calibrationState: baseline.getState(),
          calibrationProgress: baseline.getProgress(),
          faceQualityMetrics: faceQuality,
          fusionWeights: fusionResult.fusionWeights,
          branchOutputs: fusionResult.branchOutputs,
        });
      }

      // Announce meaningful state changes for screen readers
      if (
        smoothed.expression !== prevExpressionRef.current &&
        EMOTION_STATES.includes(smoothed.expression) &&
        smoothed.expression !== 'neutral' &&
        smoothed.confidence >= 0.40
      ) {
        announceTransition(prevExpressionRef.current, smoothed.expression, smoothed.confidence);
        prevExpressionRef.current = smoothed.expression;
      }

      // ── Step 8b: Evaluate Contextual Suggestions after 3–4 seconds of sustained expression ──
      if (
        smoothed.durationSeconds >= 3.0 &&
        EMOTION_STATES.includes(smoothed.expression) &&
        now - lastSuggestionCheckTime.current >= 2500
      ) {
        lastSuggestionCheckTime.current = now;
        suggestionEngineRef.current.evaluate(smoothed, preferences).then((suggestion) => {
          if (suggestion) {
            addSuggestion(suggestion);
          }
        }).catch((err) => {
          console.warn('MoodLens: Real-time suggestion evaluation error:', err);
        });
      }

      // ── Step 9: Stream Aggregation Window ──
      if (
        detection.detected &&
        EMOTION_STATES.includes(smoothed.expression)
      ) {
        windowSamplesRef.current.push({
          expression: smoothed.expression,
          confidence: smoothed.confidence,
          probabilities: { ...smoothed.probabilities },
          durationSeconds: smoothed.durationSeconds,
        });
      }

      const intervalMs = Math.max(2000, detectionInterval * 1000);
      if (now - lastStreamSampleTime.current >= intervalMs) {
        lastStreamSampleTime.current = now;
        const samples = windowSamplesRef.current;
        windowSamplesRef.current = [];

        if (samples.length > 0) {
          const emotionFrameCounts: Partial<Record<ExpressionState, number>> = {};
          const emotionMaxConfidence: Partial<Record<ExpressionState, number>> = {};
          const emotionAvgProbs: Partial<Record<ExpressionState, ExpressionProbabilities>> = {};

          for (const sample of samples) {
            const expr = sample.expression;
            emotionFrameCounts[expr] = (emotionFrameCounts[expr] || 0) + 1;
            if (!emotionMaxConfidence[expr] || sample.confidence > emotionMaxConfidence[expr]!) {
              emotionMaxConfidence[expr] = sample.confidence;
              emotionAvgProbs[expr] = sample.probabilities;
            }
          }

          const minFrameThreshold = Math.max(1, Math.floor(samples.length * 0.15));
          let bestExpr: ExpressionState = 'neutral';
          let bestScore = -1;

          for (const [expr, count] of Object.entries(emotionFrameCounts) as [ExpressionState, number][]) {
            if (count < minFrameThreshold) continue;
            const frameRatio = count / samples.length;
            const maxConf = emotionMaxConfidence[expr] || 0;
            const score = frameRatio * 0.6 + maxConf * 0.4;
            const isNeutral = expr === 'neutral';
            const adjustedScore = isNeutral ? score * 0.85 : score;

            if (adjustedScore > bestScore) {
              bestScore = adjustedScore;
              bestExpr = expr;
            }
          }

          const bestProbs = emotionAvgProbs[bestExpr] || samples[samples.length - 1].probabilities;
          const bestConfidence = emotionMaxConfidence[bestExpr] || samples[samples.length - 1].confidence;
          const maxDurationInWindow = Math.max(
            ...samples.map((s) => s.durationSeconds || 0),
            smoothed.durationSeconds,
            detectionInterval // Guarantee window duration representation
          );
          const bestDuration = maxDurationInWindow;

          // ── Step 10: Evaluate Contextual Suggestions after Live Stream Detection ──
          const streamResult = {
            ...smoothed,
            expression: bestExpr,
            confidence: bestConfidence,
            probabilities: { ...bestProbs },
            durationSeconds: Math.round(bestDuration * 10) / 10,
          };
          const suggestion = await suggestionEngineRef.current.evaluate(streamResult, preferences);

          addStreamEvent({
            id: `stream_${now}_${Math.random().toString(36).substring(2, 8)}`,
            timestamp: now,
            expression: bestExpr,
            confidence: bestConfidence,
            probabilities: { ...bestProbs },
            durationSeconds: Math.round(bestDuration * 10) / 10,
            trackingState: smoothed.trackingState,
            suggestion: suggestion || null,
          });

          if (isSessionActive) {
            addUncommittedEvent({
              expression: bestExpr,
              confidence: bestConfidence,
              duration_seconds: Math.round(bestDuration * 10) / 10,
              quality_score: smoothed.qualityScore,
              recorded_at: new Date(now).toISOString(),
            });
          }

          if (suggestion) {
            addSuggestion(suggestion);

            // Pop up the suggestion toast on every 3s, 4s, 5s live stream detection
            popupSuggestionToast(suggestion, detectionInterval);
          }
        }
      }
    } catch (err) {
      console.error('MoodLens: Inference pipeline error:', err);
    }
  }, [
    isActive, 
    videoRef, 
    preferences, 
    isSessionActive, 
    detectionInterval,
    updateExpressionState,
    updatePipelineState,
    addStreamEvent,
    addSuggestion, 
    addUncommittedEvent,
    announceTransition,
  ]);

  // Dual-Rate Lifecycle: Scheduler (30 FPS Camera / 15 FPS ML)
  useEffect(() => {
    if (!isActive) {
      schedulerRef.current.stop();
      smootherRef.current.reset();
      baselineRef.current.reset();
      windowSamplesRef.current = [];
      useExpressionStore.getState().reset();
      return;
    }

    // Start calibration on camera activation
    baselineRef.current.startCalibration();

    schedulerRef.current.start({
      onRenderFrame: () => {
        // High-frequency render callback (30 FPS)
      },
      onInferenceFrame: async (timestampMs: number) => {
        await runPipelineStep(timestampMs);
      },
    });

    return () => {
      schedulerRef.current.stop();
    };
  }, [isActive, runPipelineStep]);

  const recalibrate = useCallback(() => {
    baselineRef.current.startCalibration();
  }, []);

  return { modelSource, recalibrate };
}
