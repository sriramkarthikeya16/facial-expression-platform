/**
 * MoodLens - 5-4-3-2-1 Sensory Grounding & Guided Meditation Modal
 * Progressive interactive grounding tool for disgust or overwhelming moments.
 */
import React, { useState } from 'react';
import { X, CheckCircle, ChevronRight, RotateCcw, Sparkles, Eye, Hand, Ear, Wind, Droplets } from 'lucide-react';
import { INTEGRATION_CONFIG } from '../../../../shared/configuration/integrations.config';

interface MeditationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MeditationModal: React.FC<MeditationModalProps> = ({ isOpen, onClose }) => {
  const steps = INTEGRATION_CONFIG.WELLNESS.GROUNDING_54321.steps;
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (!isOpen) return null;

  const currentStep = steps[currentStepIdx];
  const isFinished = currentStepIdx >= steps.length;

  const getStepIcon = (sense: string) => {
    switch (sense) {
      case 'SEE':
        return <Eye className="w-8 h-8 text-teal-500" />;
      case 'TOUCH':
        return <Hand className="w-8 h-8 text-indigo-500" />;
      case 'HEAR':
        return <Ear className="w-8 h-8 text-purple-500" />;
      case 'SMELL':
        return <Wind className="w-8 h-8 text-amber-500" />;
      case 'TASTE':
        return <Droplets className="w-8 h-8 text-blue-500" />;
      default:
        return <Sparkles className="w-8 h-8 text-teal-500" />;
    }
  };

  const handleNext = () => {
    setCurrentStepIdx((prev) => prev + 1);
  };

  const handleReset = () => {
    setCurrentStepIdx(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-5 p-6 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                5-4-3-2-1 Sensory Grounding
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Anchor your sensory awareness back to the present moment.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            <span>Step {Math.min(currentStepIdx + 1, steps.length)} of {steps.length}</span>
            <span>{Math.round((Math.min(currentStepIdx, steps.length) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all duration-300 rounded-full"
              style={{ width: `${(Math.min(currentStepIdx, steps.length) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Body Card */}
        {isFinished ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-teal-100 dark:bg-teal-950/60 flex items-center justify-center text-teal-600 dark:text-teal-400 animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              Grounded and Centered
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              You have completed all 5 sensory anchors. Notice the calm in your body and mind right now.
            </p>
            <button
              onClick={handleReset}
              className="mt-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all inline-flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Practice Again</span>
            </button>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center">
              {getStepIcon(currentStep.sense)}
            </div>
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Notice {currentStep.count} Things
              </span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                {currentStep.prompt}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Exit
          </button>
          {!isFinished && (
            <button
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center space-x-1.5"
            >
              <span>{currentStepIdx === steps.length - 1 ? 'Finish' : 'Next Anchor'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
