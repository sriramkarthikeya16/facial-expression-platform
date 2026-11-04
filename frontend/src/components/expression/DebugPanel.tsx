import React, { useEffect, useRef, useState } from 'react';
import { useExpressionStore } from '../../store/expressionStore';
import { ExpressionProbabilities } from '../../types/expression';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DebugPanelProps {
  modelSource?: string; // 'onnx_int8' | 'onnx_fp32' | 'heuristic_fallback'
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ modelSource = 'unknown' }) => {
  const { 
    inferenceLatencyMs, 
    trackingState, 
    qualityScore, 
    trackingConfidence, 
    isFacePresent,
    detectorName,
    videoResolution,
    faceCount,
    rawTopExpression,
    rawConfidence,
    currentExpression,
    confidence,
    cropDimensions,
    cameraStatus,
    expressionVector,
    neutralBaseline,
    calibrationState,
    calibrationProgress,
    faceQualityMetrics,
    fusionWeights,
    branchOutputs,
  } = useExpressionStore();

  const frameCountRef = useRef(0);
  const lastFpsTime = useRef(Date.now());
  const [fps, setFps] = useState(0);
  const [showBlendShapes, setShowBlendShapes] = useState(true);
  const [showQuality, setShowQuality] = useState(false);

  useEffect(() => {
    frameCountRef.current++;
    const now = Date.now();
    const elapsed = now - lastFpsTime.current;
    if (elapsed >= 1000) {
      setFps(Math.round((frameCountRef.current / elapsed) * 1000));
      frameCountRef.current = 0;
      lastFpsTime.current = now;
    }
  });

  const modelBadgeColor =
    modelSource === 'onnx_int8'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
      : modelSource === 'onnx_fp32'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';

  const modelLabel =
    modelSource === 'onnx_int8'
      ? 'ONNX INT8'
      : modelSource === 'onnx_fp32'
      ? 'ONNX FP32'
      : '⚠ Heuristic';

  // Key coefficients to display in the blend shapes panel
  const keyBlendShapes = expressionVector ? [
    { label: 'Smile (L/R)', value: (expressionVector.mouthSmileLeft + expressionVector.mouthSmileRight) / 2 },
    { label: 'Frown (L/R)', value: (expressionVector.mouthFrownLeft + expressionVector.mouthFrownRight) / 2 },
    { label: 'Jaw Open', value: expressionVector.jawOpen },
    { label: 'Mouth Open', value: expressionVector.mouthOpen },
    { label: 'Blink (L/R)', value: (expressionVector.eyeBlinkLeft + expressionVector.eyeBlinkRight) / 2 },
    { label: 'Eye Wide (L/R)', value: (expressionVector.eyeWideLeft + expressionVector.eyeWideRight) / 2 },
    { label: 'Eye Squint (L/R)', value: (expressionVector.eyeSquintLeft + expressionVector.eyeSquintRight) / 2 },
    { label: 'Brow Inner Up', value: expressionVector.browInnerUp },
    { label: 'Brow Down (L/R)', value: (expressionVector.browDownLeft + expressionVector.browDownRight) / 2 },
    { label: 'Mouth Pucker', value: expressionVector.mouthPucker },
  ] : [];

  // Helper to extract top expression from an independent probability distribution
  const getTopBranch = (probs?: ExpressionProbabilities | null) => {
    if (!probs) return null;
    let topExpr = 'neutral';
    let maxConf = 0;
    for (const [expr, conf] of Object.entries(probs)) {
      if (typeof conf === 'number' && conf > maxConf) {
        maxConf = conf;
        topExpr = expr;
      }
    }
    return { expression: topExpr, confidence: maxConf };
  };

  const cnnTop = getTopBranch(branchOutputs?.cnn);
  const landmarkTop = getTopBranch(branchOutputs?.landmark);

  return (
    <div className="p-4 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/60 text-xs font-mono space-y-3 shadow-xl max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
        <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">
          Apple-Inspired Pipeline
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-slate-400 font-bold">{fps} FPS</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${modelBadgeColor}`}>
            {modelLabel}
          </span>
        </div>
      </div>

      {/* Core Diagnostics */}
      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
          <span className="text-slate-400">Camera / Status:</span>
          <span className={`font-bold ${isFacePresent ? 'text-emerald-400' : 'text-amber-400'}`}>
            {cameraStatus} • {videoResolution}
          </span>
        </div>
        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
          <span className="text-slate-400">Detector:</span>
          <span className="text-indigo-400 font-bold">{detectorName} ({faceCount} face{faceCount === 1 ? '' : 's'})</span>
        </div>
        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
          <span className="text-slate-400">Tracking State:</span>
          <span className={`font-bold ${isFacePresent ? 'text-emerald-400' : 'text-slate-400'}`}>
            {trackingState} ({Math.round(trackingConfidence * 100)}%)
          </span>
        </div>
        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
          <span className="text-slate-400">Crop Alignment:</span>
          <span className="text-slate-300 font-medium">{cropDimensions}</span>
        </div>
        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
          <span className="text-slate-400">Inference Latency:</span>
          <span className={`font-bold ${inferenceLatencyMs > 80 ? 'text-red-400' : inferenceLatencyMs > 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {inferenceLatencyMs} ms
          </span>
        </div>
        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
          <span className="text-slate-400">Detected Expression:</span>
          <span className="text-emerald-300 font-bold capitalize">
            {currentExpression} ({Math.round(confidence * 100)}%)
          </span>
        </div>
        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
          <span className="text-slate-400">Raw Candidate:</span>
          <span className="text-white capitalize">{rawTopExpression}</span>
        </div>

        {/* Calibration State */}
        <div className="flex justify-between items-center py-0.5 border-b border-slate-800/60">
          <span className="text-slate-400">Neutral Baseline:</span>
          <span className={`font-semibold ${
            calibrationState === 'calibrated'
              ? 'text-emerald-400'
              : calibrationState === 'calibrating'
              ? 'text-sky-400'
              : 'text-slate-400'
          }`}>
            {calibrationState === 'calibrated'
              ? '✓ Calibrated'
              : calibrationState === 'calibrating'
              ? `Calibrating (${Math.round(calibrationProgress * 100)}%)`
              : 'Not calibrated'}
          </span>
        </div>

        {/* Dynamic Fusion Weights */}
        {fusionWeights && (
          <div className="py-1 border-b border-slate-800/60">
            <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
              <span>Dynamic Fusion:</span>
              <span className="text-slate-300">
                CNN {Math.round(fusionWeights.cnnWeight * 100)}% • Landmark {Math.round(fusionWeights.landmarkWeight * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-indigo-500 h-full transition-all duration-200"
                style={{ width: `${Math.round(fusionWeights.cnnWeight * 100)}%` }}
              />
              <div
                className="bg-emerald-500 h-full transition-all duration-200"
                style={{ width: `${Math.round(fusionWeights.landmarkWeight * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Independent Branch Verification (CNN vs. Landmarks) */}
        {branchOutputs && (
          <div className="py-2 border-b border-slate-800/60 space-y-1.5">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              <span>Branch Verification:</span>
              <span className="text-[9px] text-slate-500 font-normal">Independent Outputs</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-800/50 space-y-0.5">
                <div className="flex justify-between text-indigo-300 font-bold">
                  <span>CNN Branch:</span>
                  <span>{cnnTop ? `${Math.round(cnnTop.confidence * 100)}%` : '--'}</span>
                </div>
                <div className="text-white capitalize truncate">
                  {cnnTop?.expression || 'No inference'}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/50 space-y-0.5">
                <div className="flex justify-between text-emerald-300 font-bold">
                  <span>Landmark Branch:</span>
                  <span>{landmarkTop ? `${Math.round(landmarkTop.confidence * 100)}%` : '--'}</span>
                </div>
                <div className="text-white capitalize truncate">
                  {landmarkTop?.expression || 'No landmarks'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ARKit-Inspired Expression Vector / Blend Shapes */}
      <div className="pt-1">
        <button
          onClick={() => setShowBlendShapes(!showBlendShapes)}
          className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1 hover:text-slate-200 transition-colors"
        >
          <span>Expression Vector (ARKit-Inspired)</span>
          {showBlendShapes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showBlendShapes && (
          <div className="space-y-1 mt-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
            {keyBlendShapes.length > 0 ? (
              keyBlendShapes.map((shape) => (
                <div key={shape.label} className="flex items-center space-x-2 text-[10px]">
                  <span className="w-28 text-slate-400 truncate">{shape.label}</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-400 h-full transition-all duration-100 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, shape.value * 100))}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-slate-300">
                    {shape.value.toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-[10px] text-slate-500 italic">No landmarks currently tracked</span>
            )}
          </div>
        )}
      </div>

      {/* Face Quality Signals */}
      <div className="pt-1">
        <button
          onClick={() => setShowQuality(!showQuality)}
          className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1 hover:text-slate-200 transition-colors"
        >
          <span>Face Quality Assessment</span>
          {showQuality ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showQuality && faceQualityMetrics && (
          <div className="space-y-1 mt-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Composite Quality:</span>
              <span className="text-white font-bold">{Math.round(faceQualityMetrics.overallQuality * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Landmark Conf:</span>
              <span className="text-slate-300">{Math.round(faceQualityMetrics.landmarkConfidence * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Blur:</span>
              <span className="text-slate-300">{Math.round(faceQualityMetrics.blur * 100)}% (sharpness)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Brightness:</span>
              <span className="text-slate-300">{Math.round(faceQualityMetrics.brightness * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Head Pose (Y/P/R):</span>
              <span className="text-slate-300 font-mono">
                {faceQualityMetrics.absYaw.toFixed(2)} / {faceQualityMetrics.absPitch.toFixed(2)} / {faceQualityMetrics.absRoll.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Occlusion:</span>
              <span className="text-slate-300">{Math.round(faceQualityMetrics.occlusion * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {modelSource === 'heuristic_fallback' && (
        <p className="text-amber-400 text-[10px] leading-tight pt-1.5 border-t border-slate-700/40">
          ⚠ Model running on heuristic fallback. ONNX model initializing.
        </p>
      )}
    </div>
  );
};
