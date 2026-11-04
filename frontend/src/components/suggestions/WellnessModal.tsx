/**
 * MoodLens - Interactive Box Breathing & Grounding Modal
 */
import React, { useState, useEffect } from 'react';
import { X, Play, RotateCcw, Heart } from 'lucide-react';

interface WellnessModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'breathing' | 'grounding';
}

export const WellnessModal: React.FC<WellnessModalProps> = ({
  isOpen,
  onClose,
  type = 'breathing',
}) => {
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setPhase('Inhale');
      setSecondsLeft(4);
      setCyclesCompleted(0);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setPhase((currentPhase) => {
            switch (currentPhase) {
              case 'Inhale':
                return 'Hold';
              case 'Hold':
                return 'Exhale';
              case 'Exhale':
                return 'Rest';
              case 'Rest':
                setCyclesCompleted((c) => c + 1);
                return 'Inhale';
            }
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <Heart className="w-3.5 h-3.5" />
            <span>Wellness Moment</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Box Breathing Exercise
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Regulate your nervous system with equal four-second intervals.
          </p>
        </div>

        {/* Animated Breathing Circle */}
        <div className="py-6 flex flex-col items-center justify-center">
          <div
            className={`w-44 h-44 rounded-full flex flex-col items-center justify-center border-4 border-indigo-500/30 transition-all duration-1000 ${
              phase === 'Inhale'
                ? 'scale-110 bg-indigo-500/20 border-indigo-500'
                : phase === 'Hold'
                ? 'scale-110 bg-violet-500/20 border-violet-500'
                : phase === 'Exhale'
                ? 'scale-90 bg-emerald-500/20 border-emerald-500'
                : 'scale-90 bg-slate-500/10 border-slate-500'
            }`}
          >
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {phase}
            </span>
            <span className="text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
              {secondsLeft}s
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
          <span>Cycles completed: <strong className="text-slate-700 dark:text-slate-200 font-mono">{cyclesCompleted}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all"
          >
            I feel better (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
