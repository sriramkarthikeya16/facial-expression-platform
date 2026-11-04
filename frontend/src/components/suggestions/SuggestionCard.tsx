/**
 * MoodLens - Suggestion Card Component
 * Renders contextual suggestions with rich metadata (Spotify artwork/artist, custom action buttons).
 */
import React, { useState, useEffect } from 'react';
import { SuggestionAction, EXPRESSION_DISPLAY_CONFIG } from '../../types/expression';
import { 
  Music, 
  Wind, 
  X, 
  ExternalLink, 
  Check, 
  HeartHandshake, 
  Utensils, 
  PhoneCall, 
  FileText, 
  Gamepad2, 
  Newspaper, 
  MessageSquare, 
  Sparkles,
  Play
} from 'lucide-react';

interface SuggestionCardProps {
  suggestion: SuggestionAction;
  onDismiss: (id: string) => void;
  onAction: (suggestion: SuggestionAction) => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onDismiss,
  onAction,
}) => {
  const [timeLeft, setTimeLeft] = useState(suggestion.expiresInSeconds);
  const exprConfig = EXPRESSION_DISPLAY_CONFIG[suggestion.expressionTrigger] || EXPRESSION_DISPLAY_CONFIG.neutral;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss(suggestion.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [suggestion.id, onDismiss]);

  const handleAction = () => {
    onAction(suggestion);
  };

  const isMusic = suggestion.category === 'music';
  const trackName = suggestion.actionData?.trackName;
  const artistName = suggestion.actionData?.artistName;
  const imageUrl = suggestion.actionData?.imageUrl;
  const buttonText = suggestion.actionData?.buttonText || (isMusic ? 'Open in Spotify' : 'Accept');

  const getCategoryIcon = () => {
    switch (suggestion.category) {
      case 'music':
        return <Music className="w-5 h-5 text-emerald-500" />;
      case 'wellness':
        return <Wind className="w-5 h-5 text-indigo-500" />;
      case 'food':
        return <Utensils className="w-5 h-5 text-amber-500" />;
      case 'sos':
        return <PhoneCall className="w-5 h-5 text-red-500" />;
      case 'notes':
        return <FileText className="w-5 h-5 text-purple-500" />;
      case 'games':
        return <Gamepad2 className="w-5 h-5 text-cyan-500" />;
      case 'news':
        return <Newspaper className="w-5 h-5 text-blue-500" />;
      case 'messaging':
        return <MessageSquare className="w-5 h-5 text-pink-500" />;
      case 'meditation':
        return <Sparkles className="w-5 h-5 text-teal-500" />;
      default:
        return <HeartHandshake className="w-5 h-5 text-purple-500" />;
    }
  };

  return (
    <div className={`relative p-5 rounded-3xl bg-white dark:bg-slate-800 border-2 ${
      isMusic 
        ? 'border-emerald-500/30 dark:border-emerald-500/40 shadow-emerald-500/5' 
        : 'border-indigo-500/30 dark:border-indigo-500/40 shadow-indigo-500/5'
    } shadow-xl space-y-3.5 animate-slideIn`}>
      {/* Top Bar */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isMusic ? 'bg-emerald-50 dark:bg-emerald-950/60' : 'bg-indigo-50 dark:bg-indigo-950/60'
          }`}>
            {getCategoryIcon()}
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                isMusic ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
              }`}>
                {isMusic ? 'Spotify Music' : 'Contextual Suggestion'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">({timeLeft}s)</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
              {suggestion.title}
            </h4>
          </div>
        </div>

        <button
          onClick={() => onDismiss(suggestion.id)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Dismiss suggestion"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Rich Metadata Card for Spotify / Music */}
      {isMusic && (
        <div className="flex items-center space-x-3 p-2.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20">
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt={trackName || 'Album artwork'} 
              className="w-12 h-12 rounded-xl object-cover shadow-sm border border-emerald-500/30"
              onError={(e) => {
                // Hide broken images gracefully
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {trackName || suggestion.title}
            </p>
            {artistName && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 truncate">
                {artistName}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Body Message */}
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        {suggestion.message}
      </p>

      {/* Expression trigger tag & action buttons */}
      <div className="flex items-center justify-between pt-1">
        <div className="inline-flex items-center space-x-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span>Triggered by:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
            <span>{exprConfig.emoji}</span>
            <span className="capitalize">{exprConfig.label}</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onDismiss(suggestion.id)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleAction}
            className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md transition-all ${
              isMusic 
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' 
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
            }`}
          >
            {isMusic ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{buttonText}</span>
              </>
            ) : suggestion.category === 'sos' ? (
              <>
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{buttonText}</span>
              </>
            ) : suggestion.actionType.startsWith('open') ? (
              <>
                <span>{buttonText}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>{buttonText}</span>
                <Check className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
