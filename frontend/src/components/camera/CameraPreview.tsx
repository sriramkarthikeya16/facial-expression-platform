/**
 * MoodLens - Camera Preview with Face Tracking Overlay
 */
import React from 'react';
import { Camera, CameraOff, AlertCircle, Video, RotateCcw } from 'lucide-react';
import { useExpressionStore } from '../../store/expressionStore';
import { EXPRESSION_DISPLAY_CONFIG } from '../../types/expression';
import { CameraDevice } from '../../hooks/useCamera';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  error: string | null;
  availableDevices?: CameraDevice[];
  selectedDeviceId?: string;
  onSelectDevice?: (deviceId: string) => void;
  onToggle: () => void;
  onRecalibrate?: () => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  videoRef,
  isActive,
  error,
  availableDevices = [],
  selectedDeviceId = '',
  onSelectDevice,
  onToggle,
  onRecalibrate,
}) => {
  const { 
    isFacePresent, 
    boundingBox, 
    currentExpression, 
    qualityScore, 
    inferenceLatencyMs,
    calibrationState,
    calibrationProgress,
  } = useExpressionStore();
  const config = EXPRESSION_DISPLAY_CONFIG[currentExpression];

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-xl shadow-slate-950/20 flex items-center justify-center group">
      {/* Video Element (mirrored for natural selfie view) */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${
          isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Top Left Controls: Baseline Calibration */}
      {isActive && onRecalibrate && (
        <div className="absolute top-3 left-3 z-10 flex items-center space-x-2">
          {calibrationState === 'calibrating' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-950/85 backdrop-blur-md border border-sky-500/50 shadow-lg text-[11px] text-sky-300 font-medium animate-pulse">
              <RotateCcw className="w-3 h-3 animate-spin text-sky-400" />
              <span>Calibrating ({Math.round(calibrationProgress * 100)}%)</span>
            </div>
          ) : (
            <button
              onClick={onRecalibrate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 shadow-lg text-[11px] text-slate-300 hover:text-white font-medium transition-all"
              title="Recalibrate neutral face resting baseline"
              aria-label="Recalibrate neutral face resting baseline"
            >
              <RotateCcw className="w-3 h-3 text-indigo-400" />
              <span>{calibrationState === 'calibrated' ? 'Recalibrate Neutral' : 'Calibrate Neutral'}</span>
            </button>
          )}
        </div>
      )}

      {/* Top Controls Overlay: Camera Selector */}
      {isActive && availableDevices.length > 1 && onSelectDevice && (
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 shadow-lg text-xs text-white">
            <Video className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedDeviceId}
              onChange={(e) => onSelectDevice(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
              aria-label="Select camera device"
            >
              {availableDevices.map((device, idx) => (
                <option key={device.deviceId || idx} value={device.deviceId} className="bg-slate-900 text-white">
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Face Bounding Box & HUD Overlay */}
      {isActive && isFacePresent && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Subtle animated targeting reticle in the face center */}
          <div
            className="w-48 h-60 sm:w-56 sm:h-72 rounded-3xl border-2 transition-all duration-300 relative flex flex-col justify-between p-3"
            style={{ borderColor: config.color }}
          >
            {/* Corner highlights */}
            <div className="flex justify-between">
              <span className="w-3 h-3 border-t-2 border-l-2" style={{ borderColor: config.color }} />
              <span className="w-3 h-3 border-t-2 border-r-2" style={{ borderColor: config.color }} />
            </div>

            {/* Target Label */}
            <div className="self-center px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-[11px] font-semibold text-white flex items-center space-x-1.5 shadow-md">
              <span>{config.emoji}</span>
              <span className="capitalize">{config.label}</span>
            </div>

            <div className="flex justify-between">
              <span className="w-3 h-3 border-b-2 border-l-2" style={{ borderColor: config.color }} />
              <span className="w-3 h-3 border-b-2 border-r-2" style={{ borderColor: config.color }} />
            </div>
          </div>
        </div>
      )}

      {/* Neutral Baseline Calibration Overlay */}
      {isActive && calibrationState === 'calibrating' && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 pointer-events-none transition-all duration-300">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin mb-3" />
          <h4 className="text-sm font-semibold text-white tracking-wide">Calibrating Expression Baseline</h4>
          <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
            Look toward the camera with a relaxed, neutral expression
          </p>
          <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-3.5 overflow-hidden">
            <div 
              className="bg-indigo-500 h-full transition-all duration-150 rounded-full"
              style={{ width: `${Math.round(calibrationProgress * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1.5">
            {Math.round(calibrationProgress * 100)}%
          </span>
        </div>
      )}

      {/* Inactive State Screen */}
      {!isActive && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400">
            <CameraOff className="w-8 h-8" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="text-white font-semibold text-base">Camera is turned off</h3>
            <p className="text-xs text-slate-400">
              Start your webcam to begin private, on-device facial expression analysis.
            </p>
          </div>
          <button
            onClick={onToggle}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
          >
            <Camera className="w-4 h-4" />
            <span>Enable Camera</span>
          </button>
        </div>
      )}

      {/* Error State Screen */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-950/50 border border-red-800/50 flex items-center justify-center text-red-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="text-white font-semibold text-base">Camera Access Needed</h3>
            <p className="text-xs text-red-300/80">{error}</p>
          </div>
          <button
            onClick={onToggle}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all border border-slate-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Floating Status Bar inside camera view */}
      {isActive && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 text-[11px] font-medium text-slate-300">
            <span className={`w-2 h-2 rounded-full ${isFacePresent ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{isFacePresent ? 'Tracking Face' : 'Searching for Face...'}</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-400">
            <span>{inferenceLatencyMs}ms</span>
            <span>•</span>
            <span>Q: {Math.round(qualityScore * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
