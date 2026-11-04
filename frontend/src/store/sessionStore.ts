/**
 * MoodLens - Session Management Zustand Store
 */
import { create } from 'zustand';
import { DetectionSessionDTO, ExpressionEventDTO } from '../types/api';

interface SessionState {
  currentSession: DetectionSessionDTO | null;
  isSessionActive: boolean;
  sessionStartTime: number | null;
  elapsedSeconds: number;
  uncommittedEvents: Array<{
    expression: string;
    confidence: number;
    duration_seconds: number;
    quality_score?: number;
    recorded_at: string;
  }>;
  
  startSession: (session: DetectionSessionDTO) => void;
  endSession: (session: DetectionSessionDTO) => void;
  updateElapsed: () => void;
  addUncommittedEvent: (event: {
    expression: string;
    confidence: number;
    duration_seconds: number;
    quality_score?: number;
    recorded_at: string;
  }) => void;
  clearUncommittedEvents: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  isSessionActive: false,
  sessionStartTime: null,
  elapsedSeconds: 0,
  uncommittedEvents: [],

  startSession: (session) => {
    set({
      currentSession: session,
      isSessionActive: true,
      sessionStartTime: Date.now(),
      elapsedSeconds: 0,
      uncommittedEvents: [],
    });
  },

  endSession: (session) => {
    set({
      currentSession: session,
      isSessionActive: false,
      sessionStartTime: null,
    });
  },

  updateElapsed: () => {
    const { sessionStartTime, isSessionActive } = get();
    if (isSessionActive && sessionStartTime) {
      set({ elapsedSeconds: Math.floor((Date.now() - sessionStartTime) / 1000) });
    }
  },

  addUncommittedEvent: (event) => {
    set((state) => ({
      uncommittedEvents: [...state.uncommittedEvents, event],
    }));
  },

  clearUncommittedEvents: () => {
    set({ uncommittedEvents: [] });
  },
}));
