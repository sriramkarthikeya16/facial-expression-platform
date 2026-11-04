/**
 * MoodLens - Main Live Expression Dashboard
 * Coordinates Camera, Expression HUD, Level 1-4 Suggestion Cards, and Level 5 Emergency Safety Modal.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useExpression } from '../hooks/useExpression';
import { useWebSocket } from '../hooks/useWebSocket';
import { useExpressionStore } from '../store/expressionStore';
import { useSessionStore } from '../store/sessionStore';
import { useAuthStore } from '../store/authStore';
import { sessionApi } from '../services/sessionApi';
import { SuggestionEngine } from '../ml/suggestionEngine';

import { CameraPreview } from '../components/camera/CameraPreview';
import { ExpressionBadge } from '../components/expression/ExpressionBadge';
import { ConfidenceBar } from '../components/expression/ConfidenceBar';
import { ProbabilityDistribution } from '../components/expression/ProbabilityDistribution';
import { LiveStreamFeed } from '../components/expression/LiveStreamFeed';
import { DebugPanel } from '../components/expression/DebugPanel';
import { SuggestionCard } from '../components/suggestions/SuggestionCard';
import { WellnessModal } from '../components/suggestions/WellnessModal';
import { NotesModal } from '../components/suggestions/NotesModal';
import { FocusGameModal } from '../components/suggestions/FocusGameModal';
import { MessagingModal } from '../components/suggestions/MessagingModal';
import { MeditationModal } from '../components/suggestions/MeditationModal';
import { Level5SafetyModal } from '../components/safety/Level5SafetyModal';
import { SuggestionAction } from '../types/expression';
import { contactApi, TrustedContactDTO } from '../services/contactApi';
import { Play, Square, Sparkles, Clock, ShieldAlert, ShieldCheck, AlertTriangle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export const DashboardPage: React.FC = () => {
  const {
    videoRef,
    isActive,
    error,
    toggleCamera,
    availableDevices,
    selectedDeviceId,
    selectCamera,
  } = useCamera({ autoStart: true });

  const { modelSource, recalibrate } = useExpression({ videoRef, isActive, fps: 15 });

  const [favoriteContact, setFavoriteContact] = useState<TrustedContactDTO | null>(null);

  const {
    currentExpression,
    confidence,
    probabilities,
    durationSeconds,
    safetyLevel,
    isSafetyModalOpen,
    setSafetyModalOpen,
    triggerUserSOS,
    activeSuggestions,
    removeSuggestion,
    activeModal,
    setActiveModal,
    executeAction,
  } = useExpressionStore();

  const { isAuthenticated, token } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setFavoriteContact(null);
      return;
    }
    contactApi.getFavoriteContact().then((res) => {
      if (res) setFavoriteContact(res);
    }).catch(() => {
      // Ignored if user not logged in or offline
    });
  }, [isAuthenticated, token]);

  const {
    currentSession,
    isSessionActive,
    elapsedSeconds,
    startSession,
    endSession,
    updateElapsed,
    uncommittedEvents,
    clearUncommittedEvents,
  } = useSessionStore();

  const [isWellnessOpen, setIsWellnessOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [isMeditationOpen, setIsMeditationOpen] = useState(false);
  const suggestionEngineRef = useRef<SuggestionEngine>(new SuggestionEngine());

  // WebSocket connection for active session
  useWebSocket({
    sessionId: currentSession?.id || null,
    onSuggestion: (data) => {
      console.log('WS Suggestion received:', data);
    },
  });

  // Session elapsed timer ticker
  useEffect(() => {
    const timer = setInterval(() => {
      updateElapsed();
    }, 1000);
    return () => clearInterval(timer);
  }, [updateElapsed]);

  // Periodic flush of uncommitted expression event batches every 15 seconds
  useEffect(() => {
    if (!isSessionActive || !currentSession || uncommittedEvents.length === 0) return;

    const flushTimer = setInterval(async () => {
      const eventsToSend = [...uncommittedEvents];
      if (eventsToSend.length === 0) return;

      try {
        await sessionApi.batchRecordEvents(currentSession.id, eventsToSend);
        clearUncommittedEvents();
      } catch (err) {
        console.warn('Failed to sync batch events:', err);
      }
    }, 15000);

    return () => clearInterval(flushTimer);
  }, [isSessionActive, currentSession, uncommittedEvents, clearUncommittedEvents]);

  const handleStartSession = async () => {
    try {
      const session = await sessionApi.createSession({ platform: 'web', model_version: '1.2.0' });
      startSession(session);
      toast.success('Expression detection session started');
    } catch (err) {
      toast.error('Failed to start session');
    }
  };

  const handleEndSession = async () => {
    if (!currentSession) return;
    try {
      if (uncommittedEvents.length > 0) {
        await sessionApi.batchRecordEvents(currentSession.id, uncommittedEvents);
        clearUncommittedEvents();
      }
      const ended = await sessionApi.endSession(currentSession.id, elapsedSeconds);
      endSession(ended);
      toast.success(`Session ended. Total duration: ${formatDuration(elapsedSeconds)}`);
    } catch (err) {
      toast.error('Failed to end session');
    }
  };

  const handleSuggestionAction = async (sug: SuggestionAction) => {
    const result = await executeAction(sug);
    if (result.success && result.message) {
      toast.success(result.message);
    } else if (!result.success && result.message) {
      toast.error(result.message);
    }
  };

  const handleEmergencyCall = async (contact: TrustedContactDTO | null) => {
    setSafetyModalOpen(false);
    const result = await suggestionEngineRef.current.executeAction({
      action_id: `act_sos_${Date.now()}`,
      action_token: `act_tok_${Date.now()}`,
      action_type: 'call_trusted_contact',
      confirmed_by_user: true,
      confirmed_at: Date.now(),
      payload: {
        contact,
        dialUri: contact?.phone_number ? `tel:${contact.phone_number}` : 'tel:988',
      },
    });
    toast.success(result.message);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Privacy-First Non-Diagnostic Disclaimer Banner */}
      <div className="px-5 py-3.5 rounded-2xl bg-indigo-50/70 dark:bg-slate-800/70 border border-indigo-200/60 dark:border-slate-700/60 flex items-start space-x-3 text-xs text-slate-700 dark:text-slate-300 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-slate-900 dark:text-white">Estimated Facial Expression:</strong> MoodLens provides real-time estimated facial expression detection using privacy-first on-device neural inference. Facial expressions are not definitive evidence of someone's internal emotional state or a psychological diagnosis. All video frames remain 100% on-device in your browser.
        </p>
      </div>

      {/* Top Banner & Session Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Live Expression Stream
            </h1>
            <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active</span>
            </span>
            {safetyLevel === 5 && (
              <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 text-xs font-semibold animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Level 5 Safety Active</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visible facial expression classifications with 3–5s stream snapshots & EMA temporal smoothing.
          </p>
        </div>

        {/* Session Action */}
        <div className="flex items-center space-x-3">
          {/* Explicit User SOS Support Trigger */}
          <button
            onClick={triggerUserSOS}
            className="px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold shadow-sm hover:bg-red-100 transition-all flex items-center space-x-1.5"
            title="Explicit Emergency / Crisis Support"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span>SOS Support</span>
          </button>

          {isSessionActive ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDuration(elapsedSeconds)}</span>
              </div>
              <button
                onClick={handleEndSession}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all flex items-center space-x-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>End Session</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartSession}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Record New Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left = Camera + Suggestions + Stream Feed, Right = Expression Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera View & Live Stream Feed */}
        <div className="lg:col-span-7 space-y-5">
          <CameraPreview
            videoRef={videoRef}
            isActive={isActive}
            error={error}
            availableDevices={availableDevices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={selectCamera}
            onToggle={toggleCamera}
            onRecalibrate={recalibrate}
          />

          {/* Live Expression Stream Feed (Every 3 to 5 seconds) */}
          <LiveStreamFeed />
        </div>

        {/* Right Column: Real-time Analysis */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Top Expression State Badge */}
          <ExpressionBadge
            expression={currentExpression}
            confidence={confidence}
            durationSeconds={durationSeconds}
            size="lg"
          />

          {/* Confidence Meter */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
            <ConfidenceBar expression={currentExpression} confidence={confidence} />
          </div>

          {/* Contextual Suggestions: Beside Live Stream Detections, Below Prediction Confidence */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Contextual Suggestions</span>
              </div>
              {activeSuggestions.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold font-mono">
                  {activeSuggestions.length} active
                </span>
              )}
            </div>

            {activeSuggestions.length > 0 ? (
              <div className="space-y-3">
                {activeSuggestions.map((sug) => (
                  <SuggestionCard
                    key={sug.id}
                    suggestion={sug}
                    onDismiss={removeSuggestion}
                    onAction={handleSuggestionAction}
                  />
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 text-center py-5 shadow-sm space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 mx-auto flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Awaiting Sustained Expression
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Personalized suggestions (Spotify music, breathing, focus) appear here after holding an expression for 3–4 seconds.
                </p>
              </div>
            )}
          </div>

          {/* 7-Class Distribution Breakdown */}
          <ProbabilityDistribution probabilities={probabilities} />

          {/* Developer / Pipeline Debug HUD */}
          <DebugPanel modelSource={modelSource} />
        </div>
      </div>

      {/* Interactive Box Breathing Modal */}
      <WellnessModal
        isOpen={activeModal === 'wellness' || isWellnessOpen}
        onClose={() => {
          setActiveModal(null);
          setIsWellnessOpen(false);
        }}
        type="breathing"
      />

      {/* Calming / Venting Notes Modal */}
      <NotesModal
        isOpen={activeModal === 'notes' || isNotesOpen}
        onClose={() => {
          setActiveModal(null);
          setIsNotesOpen(false);
        }}
      />

      {/* Zen Focus Memory Game Modal */}
      <FocusGameModal
        isOpen={activeModal === 'game' || isGameOpen}
        onClose={() => {
          setActiveModal(null);
          setIsGameOpen(false);
        }}
      />

      {/* Contact Check-In Messaging Modal */}
      <MessagingModal
        isOpen={activeModal === 'messaging' || isMessagingOpen}
        onClose={() => {
          setActiveModal(null);
          setIsMessagingOpen(false);
        }}
      />

      {/* 5-4-3-2-1 Sensory Grounding & Guided Meditation Modal */}
      <MeditationModal
        isOpen={activeModal === 'meditation' || isMeditationOpen}
        onClose={() => {
          setActiveModal(null);
          setIsMeditationOpen(false);
        }}
      />

      {/* Level 5 Full-Screen Distress Safety Modal */}
      <Level5SafetyModal
        isOpen={isSafetyModalOpen}
        trustedContact={favoriteContact}
        durationSeconds={durationSeconds}
        confidence={confidence}
        onCallFavorite={handleEmergencyCall}
        onDismiss={() => setSafetyModalOpen(false)}
        onStartBreathing={() => {
          setSafetyModalOpen(false);
          setActiveModal('wellness');
        }}
      />
    </div>
  );
};
