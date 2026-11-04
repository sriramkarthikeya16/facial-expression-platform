/**
 * MoodLens - Calming / Venting Notes Modal
 * 100% private on-device journaling and mental discharge for tense moments.
 */
import React, { useState, useEffect } from 'react';
import { X, Trash2, Save, Sparkles, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotesModal: React.FC<NotesModalProps> = ({ isOpen, onClose }) => {
  const [noteText, setNoteText] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('moodlens_venting_draft') || '';
      setNoteText(saved);
      setIsSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('moodlens_venting_draft', noteText);
    setIsSaved(true);
    toast.success('Note securely saved to your local device.');
  };

  const handleShredAndRelease = () => {
    setNoteText('');
    localStorage.removeItem('moodlens_venting_draft');
    toast.success('Thoughts released and cleared. Take a deep breath.');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4 p-6 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Private Venting & Calming Space
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                100% on-device. Nothing typed here is ever uploaded or shared.
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

        {/* Text Area */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Write down whatever is bothering you right now:
          </label>
          <textarea
            value={noteText}
            onChange={(e) => {
              setNoteText(e.target.value);
              setIsSaved(false);
            }}
            placeholder="Express your raw thoughts freely here without judgment..."
            rows={7}
            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none leading-relaxed font-sans"
          />
          <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
            <span>{noteText.length} characters</span>
            {isSaved && (
              <span className="flex items-center space-x-1 text-emerald-500 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved locally</span>
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleShredAndRelease}
            disabled={!noteText.trim()}
            className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center space-x-1.5"
            title="Clear and let go of these thoughts"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Shred & Release</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={!noteText.trim()}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Note</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
