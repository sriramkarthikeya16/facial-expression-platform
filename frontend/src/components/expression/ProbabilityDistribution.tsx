/**
 * MoodLens - 7-Class Probability Distribution List
 */
import React from 'react';
import { ExpressionProbabilities, EXPRESSION_DISPLAY_CONFIG, PrimaryExpression } from '../../types/expression';

interface ProbabilityDistributionProps {
  probabilities: ExpressionProbabilities;
}

const PRIMARY_CLASSES: PrimaryExpression[] = [
  'happy',
  'sad',
  'angry',
  'fear',
  'disgust',
  'surprise',
  'neutral',
];

export const ProbabilityDistribution: React.FC<ProbabilityDistributionProps> = ({ probabilities }) => {
  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Class Probability Breakdown
        </h3>
        <span className="text-[10px] font-mono text-slate-400">EMA Calibrated</span>
      </div>

      <div className="space-y-2.5">
        {PRIMARY_CLASSES.map((cls) => {
          const config = EXPRESSION_DISPLAY_CONFIG[cls];
          const prob = probabilities[cls] || 0;
          const pct = Math.round(prob * 100);

          return (
            <div key={cls} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm">{config.emoji}</span>
                  <span className="capitalize text-slate-700 dark:text-slate-300">{config.label}</span>
                </div>
                <span className="font-mono text-slate-600 dark:text-slate-400">{pct}%</span>
              </div>

              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: config.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
