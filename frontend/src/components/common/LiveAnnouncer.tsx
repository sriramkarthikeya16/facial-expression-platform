/**
 * MoodLens - Screen Reader Live Announcer (WCAG 2.1 AAA)
 * Renders an accessible polite live region for vocalizing expression transitions.
 */
import React from 'react';
import { useAccessibilityStore } from '../../store/accessibilityStore';

export const LiveAnnouncer: React.FC = () => {
  const announcementText = useAccessibilityStore((s) => s.announcementText);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
      }}
    >
      {announcementText}
    </div>
  );
};
