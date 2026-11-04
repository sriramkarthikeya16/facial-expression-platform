/**
 * MoodLens - Accessibility Store (WCAG 2.1 AAA Compliance)
 * Manages high contrast mode, reduced motion, and debounced screen-reader live announcements.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AccessibilityState {
  highContrast: boolean;
  reduceMotion: boolean;
  screenReaderAnnouncements: boolean;
  announcementText: string;
  lastAnnouncedExpression: string | null;
  lastAnnouncementTime: number;

  setHighContrast: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  setScreenReaderAnnouncements: (enabled: boolean) => void;
  announceTransition: (fromExpr: string, toExpr: string, confidence: number) => void;
  clearAnnouncement: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set, get) => ({
      highContrast: false,
      reduceMotion: false,
      screenReaderAnnouncements: true,
      announcementText: '',
      lastAnnouncedExpression: null,
      lastAnnouncementTime: 0,

      setHighContrast: (enabled: boolean) => {
        set({ highContrast: enabled });
        if (enabled) {
          document.documentElement.classList.add('high-contrast');
        } else {
          document.documentElement.classList.remove('high-contrast');
        }
      },

      setReduceMotion: (enabled: boolean) => {
        set({ reduceMotion: enabled });
        if (enabled) {
          document.documentElement.classList.add('reduce-motion');
        } else {
          document.documentElement.classList.remove('reduce-motion');
        }
      },

      setScreenReaderAnnouncements: (enabled: boolean) => {
        set({ screenReaderAnnouncements: enabled });
      },

      announceTransition: (fromExpr: string, toExpr: string, confidence: number) => {
        const { screenReaderAnnouncements, lastAnnouncedExpression, lastAnnouncementTime } = get();
        if (!screenReaderAnnouncements) return;

        const now = Date.now();
        // Debounce announcements: minimum 4 seconds between announcements and must be a distinct emotion
        if (toExpr === lastAnnouncedExpression && now - lastAnnouncementTime < 8000) {
          return;
        }

        if (now - lastAnnouncementTime < 3500) {
          return;
        }

        const pct = Math.round(confidence * 100);
        const text = `Expression changed to ${toExpr} with ${pct} percent confidence`;

        set({
          announcementText: text,
          lastAnnouncedExpression: toExpr,
          lastAnnouncementTime: now,
        });
      },

      clearAnnouncement: () => set({ announcementText: '' }),
    }),
    {
      name: 'moodlens-accessibility-settings',
    }
  )
);
