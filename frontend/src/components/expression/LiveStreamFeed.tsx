import React from 'react';
import { useExpressionStore } from '../../store/expressionStore';
import { EXPRESSION_DISPLAY_CONFIG, ExpressionState, PrimaryExpression } from '../../types/expression';
import { Activity, Clock, Trash2, Radio, TrendingUp, Sparkles } from 'lucide-react';

const EMOTION_CLASSES: PrimaryExpression[] = [
  'happy', 'sad', 'angry', 'fear', 'disgust', 'surprise', 'neutral',
];

export const LiveStreamFeed: React.FC = () => {
  const { 
    streamEvents, 
    clearStreamEvents, 
    detectionInterval, 
    setDetectionInterval,
    isFacePresent,
    currentExpression,
    confidence,
    executeAction,
  } = useExpressionStore();

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const intervalOptions = [3, 4, 5];

  // Build a mini bar for top-3 probabilities for a given event
  const getTopProbs = (probs: { [key: string]: number }) => {
    return EMOTION_CLASSES
      .map((cls) => ({ cls, prob: probs[cls] || 0, config: EXPRESSION_DISPLAY_CONFIG[cls] }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 3)
      .filter((p) => p.prob > 0.03);
  };

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Live Stream Detections
            </h3>
            <p className="text-[11px] text-slate-400">Dominant expression per {detectionInterval}s window</p>
          </div>
        </div>

        {/* Interval Selector & Clear */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200/60 dark:border-slate-600/50 text-xs">
            {intervalOptions.map((sec) => (
              <button
                key={sec}
                onClick={() => setDetectionInterval(sec)}
                className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold transition-all ${
                  detectionInterval === sec
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          {streamEvents.length > 0 && (
            <button
              onClick={clearStreamEvents}
              title="Clear Stream History"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Live Now Indicator */}
      {isFacePresent && streamEvents.length === 0 && (
        <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
            Analyzing — first snapshot in {detectionInterval}s…
          </span>
          {EXPRESSION_DISPLAY_CONFIG[currentExpression as ExpressionState] && (
            <span className="ml-auto text-[11px] font-mono text-slate-500">
              {EXPRESSION_DISPLAY_CONFIG[currentExpression as ExpressionState].emoji} {Math.round(confidence * 100)}%
            </span>
          )}
        </div>
      )}

      {/* Stream Feed Cards */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {streamEvents.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-2xl bg-slate-50 dark:bg-slate-700/40 flex items-center justify-center text-slate-400">
              <Activity className="w-5 h-5 animate-pulse text-indigo-400" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isFacePresent
                ? `Face detected — stream snapshot in ${detectionInterval}s`
                : 'Position your face in frame to begin live detection'}
            </p>
          </div>
        ) : (
          streamEvents.map((evt, idx) => {
            const config = EXPRESSION_DISPLAY_CONFIG[evt.expression] || EXPRESSION_DISPLAY_CONFIG.neutral;
            const pct = Math.round(evt.confidence * 100);
            const topProbs = getTopProbs(evt.probabilities as unknown as { [key: string]: number });

            return (
              <div
                key={evt.id}
                className={`p-3 rounded-2xl border transition-all ${
                  idx === 0
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/40 shadow-xs'
                    : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-700/40 opacity-90'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Expression & Emoji */}
                  <div className="flex items-start space-x-2.5 min-w-0">
                    <span className="text-xl flex-shrink-0">{config.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold capitalize text-slate-900 dark:text-white">
                          {config.label}
                        </span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider flex-shrink-0">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span className="flex items-center space-x-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formatTime(evt.timestamp)}</span>
                        </span>
                        <span>•</span>
                        <span>{evt.durationSeconds}s active</span>
                      </div>

                      {/* Top-3 probability mini-bars */}
                      {topProbs.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {topProbs.map(({ cls, prob, config: cfg }) => (
                            <div key={cls} className="flex items-center space-x-1.5">
                              <span className="text-[10px] w-14 truncate text-slate-500 dark:text-slate-400">{cfg.label}</span>
                              <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.round(prob * 100)}%`,
                                    backgroundColor: cfg.color,
                                  }}
                                />
                              </div>
                              <span className="text-[9px] font-mono text-slate-400 w-6 text-right">
                                {Math.round(prob * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Main Confidence Indicator */}
                  <div className="text-right space-y-1 flex-shrink-0 w-16">
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                      {pct}%
                    </span>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: config.color,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Attached Live Suggestion Popup / Pill */}
                {evt.suggestion && (
                  <div className="mt-2.5 pt-2 border-t border-indigo-100/70 dark:border-indigo-900/40 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 animate-pulse" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                          {evt.suggestion.title}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {evt.suggestion.message}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => executeAction(evt.suggestion!)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex-shrink-0 shadow-xs transition-all"
                    >
                      {evt.suggestion.actionData?.buttonText || 'Open'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer summary */}
      {streamEvents.length > 0 && (
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/40">
          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
            <TrendingUp className="w-3 h-3" />
            <span>{streamEvents.length} snapshot{streamEvents.length !== 1 ? 's' : ''} captured</span>
          </div>
          {streamEvents.length > 1 && (() => {
            // Compute session dominant emotion
            const counts: Partial<Record<string, number>> = {};
            streamEvents.forEach(e => { counts[e.expression] = (counts[e.expression] || 0) + 1; });
            const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
            const domConfig = dominant ? EXPRESSION_DISPLAY_CONFIG[dominant[0] as ExpressionState] : null;
            return domConfig ? (
              <span className="text-[10px] text-slate-400">
                Session dominant: {domConfig.emoji} <span className="font-medium text-slate-600 dark:text-slate-300">{domConfig.label}</span>
              </span>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
};
