/**
 * MoodLens - Expression Badge Component
 */
import React from 'react';
import { ExpressionState, EXPRESSION_DISPLAY_CONFIG } from '../../types/expression';

interface ExpressionBadgeProps {
  expression: ExpressionState;
  confidence: number;
  durationSeconds?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const ExpressionBadge: React.FC<ExpressionBadgeProps> = ({
  expression,
  confidence,
  durationSeconds,
  size = 'md',
}) => {
  const config = EXPRESSION_DISPLAY_CONFIG[expression];
  const confidencePct = Math.round(confidence * 100);

  if (size === 'lg') {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-lg text-center space-y-3">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-inner transition-all duration-300"
          style={{ backgroundColor: `${config.color}15` }}
        >
          {config.emoji}
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
            Detected Expression
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white capitalize">
            {config.label}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {expression === 'no_face'
              ? 'No face visible in frame'
              : expression === 'occluded'
              ? 'Face partially obstructed'
              : `${confidencePct}% calibrated confidence`}
          </p>
        </div>

        {durationSeconds !== undefined && durationSeconds > 1 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
            Active for {durationSeconds.toFixed(1)}s
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold ${config.badgeBg} ${config.textColor} transition-all duration-200`}
    >
      <span>{config.emoji}</span>
      <span className="capitalize">{config.label}</span>
      {confidence > 0 && <span className="opacity-75 font-mono">{confidencePct}%</span>}
    </div>
  );
};
