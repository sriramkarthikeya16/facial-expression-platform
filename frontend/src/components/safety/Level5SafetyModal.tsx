/**
 * MoodLens - Level 5 Full-Screen Emergency / Acute Distress Safety Modal
 * Triggered on sustained high-confidence fear / distress patterns.
 * Non-blocking, accessibility-grounded, requires explicit user click before any SOS action.
 */
import React, { useState } from 'react';
import { Phone, CheckCircle, Wind, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { TrustedContact } from '../../types/api';
import { TrustedContactDTO } from '../../services/contactApi';

interface Level5SafetyModalProps {
  isOpen: boolean;
  trustedContact: TrustedContactDTO | TrustedContact | null;
  durationSeconds: number;
  confidence: number;
  onCallFavorite: (contact: TrustedContactDTO | TrustedContact | null) => void;
  onDismiss: () => void;
  onStartBreathing: () => void;
}

export const Level5SafetyModal: React.FC<Level5SafetyModalProps> = ({
  isOpen,
  trustedContact,
  durationSeconds,
  confidence,
  onCallFavorite,
  onDismiss,
  onStartBreathing,
}) => {
  const [isCalling, setIsCalling] = useState(false);

  if (!isOpen) return null;

  const handleCall = () => {
    setIsCalling(true);
    onCallFavorite(trustedContact);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="safety-modal-title"
      aria-describedby="safety-modal-desc"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-purple-500/40 rounded-3xl shadow-2xl p-6 sm:p-8 text-white overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
          aria-label="Dismiss alert"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <AlertTriangle className="w-7 h-7 text-purple-400 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Safety Support Level 5
            </span>
            <h2 id="safety-modal-title" className="text-2xl font-bold tracking-tight text-white mt-0.5">
              Need a little help?
            </h2>
          </div>
        </div>

        {/* Message */}
        <p id="safety-modal-desc" className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
          You appear to be experiencing sustained signs of tension or distress ({Math.round(confidence * 100)}% pattern over {Math.round(durationSeconds)}s). Would you like to connect with a trusted person or take a moment to breathe?
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* 1. Call Favorite */}
          <button
            onClick={handleCall}
            disabled={isCalling}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-2xl shadow-lg shadow-purple-900/30 transition-all transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-base font-bold">
                  {trustedContact ? `Call ${trustedContact.name}` : 'Open Emergency Dialer'}
                </div>
                <div className="text-xs text-purple-200">
                  {trustedContact?.phone_number ? trustedContact.phone_number : 'Direct phone support'}
                </div>
              </div>
            </div>
            <span className="text-xs uppercase bg-white/20 px-2.5 py-1 rounded-full font-medium">
              Call Now
            </span>
          </button>

          {/* 2. Start Breathing Exercise */}
          <button
            onClick={onStartBreathing}
            className="w-full flex items-center justify-between p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-white font-medium rounded-2xl transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Wind className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">Start Guided Breathing</div>
                <div className="text-xs text-slate-400">2-minute box breathing relaxation</div>
              </div>
            </div>
            <span className="text-xs text-slate-400 bg-slate-700/50 px-2.5 py-1 rounded-full">
              4-7-8
            </span>
          </button>

          {/* 3. I'm OK */}
          <button
            onClick={onDismiss}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            I'm OK, dismiss this alert
          </button>
        </div>

        {/* Ethical Notice Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-500">
            MoodLens never initiates calls or transmits data without your direct confirmation.
          </p>
        </div>
      </div>
    </div>
  );
};
