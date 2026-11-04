import React from 'react';
import toast from 'react-hot-toast';
import { SuggestionAction } from '../../types/expression';
import { useExpressionStore } from '../../store/expressionStore';
import { Sparkles, Music, Wind, Coffee, PhoneCall, FileText, Gamepad2, MessageSquare } from 'lucide-react';

interface SuggestionToastProps {
  t: { id: string; visible: boolean };
  suggestion: SuggestionAction;
  intervalSeconds: number;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  music: <Music className="w-4 h-4 text-emerald-400" />,
  wellness: <Wind className="w-4 h-4 text-cyan-400" />,
  meditation: <Wind className="w-4 h-4 text-cyan-400" />,
  food: <Coffee className="w-4 h-4 text-amber-400" />,
  sos: <PhoneCall className="w-4 h-4 text-rose-400" />,
  notes: <FileText className="w-4 h-4 text-violet-400" />,
  games: <Gamepad2 className="w-4 h-4 text-indigo-400" />,
  news: <Sparkles className="w-4 h-4 text-blue-400" />,
  messaging: <MessageSquare className="w-4 h-4 text-pink-400" />,
};

export const SuggestionToast: React.FC<SuggestionToastProps> = ({ t, suggestion, intervalSeconds }) => {
  const executeAction = useExpressionStore((s) => s.executeAction);

  const handleAction = async () => {
    toast.dismiss(t.id);
    const result = await executeAction(suggestion);
    if (result.success && result.message) {
      toast.success(result.message);
    } else if (!result.success && result.message) {
      toast.error(result.message);
    }
  };

  const icon = CATEGORY_ICONS[suggestion.category] || <Sparkles className="w-4 h-4 text-indigo-400" />;

  return (
    <div
      className={`${
        t.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
      } transform transition-all duration-200 max-w-sm w-full bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 shadow-2xl rounded-2xl p-3.5 flex items-start space-x-3 text-white pointer-events-auto`}
    >
      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-1.5">
          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-bold uppercase tracking-wider">
            {intervalSeconds}s Live Suggestion
          </span>
          <span className="text-[10px] text-slate-400 capitalize">
            {suggestion.expressionTrigger} ({Math.round(suggestion.confidence * 100)}%)
          </span>
        </div>
        <p className="text-xs font-semibold text-white truncate mt-1">{suggestion.title}</p>
        <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">{suggestion.message}</p>
        <div className="mt-2.5 flex items-center space-x-2">
          <button
            onClick={handleAction}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all shadow-sm"
          >
            {suggestion.actionData?.buttonText || 'Take Action'}
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 text-[11px] transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export function popupSuggestionToast(suggestion: SuggestionAction, intervalSeconds: number) {
  toast.custom(
    (t) => (
      <SuggestionToast
        t={t}
        suggestion={suggestion}
        intervalSeconds={intervalSeconds}
      />
    ),
    {
      id: `stream_sug_${suggestion.ruleId}`,
      duration: 5000,
    }
  );
}
