/**
 * MoodLens - Session History & Timeline Analysis Page
 * Includes per-session deletion and timeline review.
 */
import React, { useState, useEffect } from 'react';
import { sessionApi } from '../services/sessionApi';
import { DetectionSessionDTO, ExpressionEventDTO } from '../types/api';
import { EXPRESSION_DISPLAY_CONFIG, ExpressionState } from '../types/expression';
import { History, Calendar, Clock, ChevronRight, Activity, Trash2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

export const HistoryPage: React.FC = () => {
  const [sessions, setSessions] = useState<DetectionSessionDTO[]>([]);
  const [selectedSession, setSelectedSession] = useState<DetectionSessionDTO | null>(null);
  const [sessionEvents, setSessionEvents] = useState<ExpressionEventDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await sessionApi.listSessions(1, 50);
        setSessions(data.items);
        if (data.items.length > 0) {
          setSelectedSession(data.items[0]);
        }
      } catch (err) {
        console.error('Failed to load session history:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSessions();
  }, []);

  useEffect(() => {
    if (!selectedSession) {
      setSessionEvents([]);
      return;
    }
    const fetchEvents = async () => {
      try {
        const events = await sessionApi.getSessionEvents(selectedSession.id);
        setSessionEvents(events);
      } catch (err) {
        console.error('Failed to fetch session events:', err);
      }
    };
    fetchEvents();
  }, [selectedSession]);

  const handleDeleteSession = async (sessionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    setDeletingId(sessionId);
    try {
      await sessionApi.deleteSession(sessionId);
      toast.success('Session deleted successfully');

      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);

      if (selectedSession?.id === sessionId) {
        setSelectedSession(updated.length > 0 ? updated[0] : null);
      }
    } catch (err) {
      toast.error('Failed to delete session');
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const chartData = sessionEvents.map((evt, idx) => ({
    time: `${idx * 5}s`,
    confidence: Math.round(evt.confidence * 100),
    expression: evt.expression,
  }));

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
          <History className="w-6 h-6 text-indigo-500" />
          <span>Session History</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Review and manage your past detection sessions and expression timeline distributions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sessions List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Recorded Sessions ({sessions.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-2">
              <Activity className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No sessions recorded yet</p>
              <p className="text-xs text-slate-400">Start a session from the live dashboard.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {sessions.map((sess) => {
                const isSelected = selectedSession?.id === sess.id;
                const isDeleting = deletingId === sess.id;

                return (
                  <div
                    key={sess.id}
                    onClick={() => setSelectedSession(sess)}
                    className={`group w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 shadow-sm'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-900 dark:text-white">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{formatDate(sess.started_at)}</span>
                        <span className="text-slate-400">•</span>
                        <span className="shrink-0">{formatTime(sess.started_at)}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>Duration: {sess.total_duration_seconds ? `${sess.total_duration_seconds}s` : 'Active'}</span>
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-medium">
                          {sess.platform}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        disabled={isDeleting}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors opacity-80 group-hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                        title="Delete Session"
                        aria-label="Delete Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className={`w-4 h-4 text-slate-400 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Timeline Chart & Detail View */}
        <div className="lg:col-span-7 space-y-4">
          {selectedSession ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/50 gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Timeline Distribution
                  </h3>
                  <p className="text-xs text-slate-400">
                    Confidence and expression progression across session duration.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-medium">
                    {sessionEvents.length} windowed samples
                  </div>
                  <button
                    onClick={() => handleDeleteSession(selectedSession.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                    title="Delete this session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chart */}
              {sessionEvents.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                      <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1E293B',
                          borderColor: '#334155',
                          borderRadius: '1rem',
                          color: '#F8FAFC',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="confidence"
                        stroke="#6366F1"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#confidenceGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                  No aggregated window events recorded for this session.
                </div>
              )}

              {/* Expression event tag breakdown */}
              {sessionEvents.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Recorded Expression Windows
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {sessionEvents.map((evt, idx) => {
                      const cfg = EXPRESSION_DISPLAY_CONFIG[evt.expression as ExpressionState] || EXPRESSION_DISPLAY_CONFIG.neutral;
                      return (
                        <span
                          key={idx}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.badgeBg} ${cfg.textColor}`}
                        >
                          <span>{cfg.emoji}</span>
                          <span className="capitalize">{cfg.label}</span>
                          <span className="opacity-75 font-mono">{Math.round(evt.confidence * 100)}%</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Select a session from the list to view its details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
