/**
 * MoodLens - Confidence Bar Component
 */
import React from 'react';
import { ExpressionState, EXPRESSION_DISPLAY_CONFIG } from '../../types/expression';

interface ConfidenceBarProps {
  expression: ExpressionState;
  confidence: number;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ expression, confidence }) => {
  const config = EXPRESSION_DISPLAY_CONFIG[expression];
  const pct = Math.min(100, Math.max(0, Math.round(confidence * 100)));

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex justify-between items-center text-xs font-medium">
        <span className="text-slate-600 dark:text-slate-400">Prediction Confidence</span>
        <span className="font-mono text-slate-800 dark:text-slate-200">{pct}%</span>
      </div>

      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden p-0.5">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: config.color,
          }}
        />
      </div>
    </div>
  );
};
