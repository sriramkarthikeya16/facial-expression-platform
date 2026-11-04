# MoodLens — UI/UX Design Document

## 1. Design Direction
Modern + Minimal + Professional with dark/light mode support.
Rationale: MoodLens handles sensitive emotional data. The interface must convey trustworthiness, calm, and scientific precision. Avoid playful or childlike aesthetics that could undermine credibility. Subtle animations for transitions only — no distracting effects.

## 2. Color System

### Light Mode
| Token | Value | Usage |
|---|---|---|
| primary | #6366F1 | Buttons, active states, links |
| primary-dark | #4F46E5 | Hover states on primary |
| secondary | #8B5CF6 | Accent, highlights |
| background | #F9FAFB | Page background |
| surface | #FFFFFF | Cards, panels |
| surface-2 | #F3F4F6 | Secondary surfaces |
| text-primary | #111827 | Main body text |
| text-muted | #6B7280 | Secondary text, placeholders |
| border | #E5E7EB | Dividers, input borders |
| success | #10B981 | Positive states |
| warning | #F59E0B | Caution states |
| error | #EF4444 | Errors, destructive actions |
| info | #3B82F6 | Informational states |

### Dark Mode
| Token | Value | Usage |
|---|---|---|
| primary | #818CF8 | Buttons, active states (lighter for dark bg) |
| primary-dark | #6366F1 | Hover states |
| background | #0F172A | Page background (slate-900) |
| surface | #1E293B | Cards, panels (slate-800) |
| surface-2 | #334155 | Secondary surfaces (slate-700) |
| text-primary | #F1F5F9 | Main body text |
| text-muted | #94A3B8 | Secondary text |
| border | #334155 | Dividers |

### Expression Color Map
| Expression | Color | HEX |
|---|---|---|
| Happy | Emerald | #10B981 |
| Sad | Blue | #3B82F6 |
| Angry | Red | #EF4444 |
| Fear | Purple | #8B5CF6 |
| Disgust | Amber | #F59E0B |
| Surprise | Pink | #EC4899 |
| Neutral | Gray | #6B7280 |
| Unknown | Slate | #94A3B8 |
| Occluded | Orange | #F97316 |
| No Face | Muted | #CBD5E1 |

Each expression MUST also have a distinct icon (not rely on color alone) for accessibility.

| Expression | Emoji | Lucide Icon |
|---|---|---|
| Happy | 😊 | Smile |
| Sad | 😢 | Frown |
| Angry | 😠 | Angry |
| Fear | 😨 | AlertTriangle |
| Disgust | 🤢 | ThumbsDown |
| Surprise | 😲 | Zap |
| Neutral | 😐 | Minus |
| Unknown | ❓ | HelpCircle |
| Occluded | 👁️ | EyeOff |
| No Face | 📵 | CameraOff |

## 3. Typography

| Element | Size | Weight | Line Height |
|---|---|---|---|
| Heading 1 | 2.25rem (36px) | 700 (Bold) | 1.2 |
| Heading 2 | 1.875rem (30px) | 600 (Semibold) | 1.25 |
| Heading 3 | 1.5rem (24px) | 600 (Semibold) | 1.33 |
| Heading 4 | 1.25rem (20px) | 600 (Semibold) | 1.4 |
| Body Large | 1.125rem (18px) | 400 (Normal) | 1.6 |
| Body | 1rem (16px) | 400 (Normal) | 1.5 |
| Body Small | 0.875rem (14px) | 400 (Normal) | 1.5 |
| Label | 0.75rem (12px) | 500 (Medium) | 1.4 |
| Caption | 0.75rem (12px) | 400 (Normal) | 1.4 |

Font: **Inter** loaded from Google Fonts with display=swap. Fallback: system-ui, -apple-system, sans-serif.

## 4. Component Definitions

### Buttons
```
Primary: bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors
Secondary: bg-surface text-text-primary border border-border px-4 py-2 rounded-lg font-medium hover:bg-surface-2
Danger: bg-error text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600
Ghost: text-primary px-4 py-2 rounded-lg font-medium hover:bg-primary/10
Icon Button: p-2 rounded-full hover:bg-surface-2 text-text-muted
```

### Inputs
```
border border-border rounded-lg px-3 py-2 w-full bg-surface text-text-primary
focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
placeholder:text-muted
Error state: border-error focus:ring-error
```

### Cards
```
bg-surface rounded-xl border border-border p-6 shadow-sm
```

### Suggestion Card
```
bg-surface rounded-xl border-l-4 border-l-{expression-color} p-4 shadow-md
Contains: expression icon, suggestion text, [Action Button] [Dismiss Button]
Animation: slide-in from right, fade-out on dismiss
```

### Expression Badge
```
Inline pill: {icon} {expression-label}
bg-{expression-color}/10 text-{expression-color} px-3 py-1 rounded-full text-sm font-medium
Large: 3rem icon + text below for dashboard main display
```

### Confidence Bar
```
Full-width horizontal bar:
bg-surface-2 rounded-full h-2
Fill: bg-{expression-color} rounded-full transition-all duration-300
Label: "{confidence}% confidence" text-muted text-sm
```

### Modal
```
Fixed overlay: bg-black/50 backdrop-blur-sm
Content: bg-surface rounded-2xl p-6 max-w-md mx-auto shadow-2xl
Header: title + close button (X)
Footer: action buttons
Animation: scale-in fade-in
```

### Toast Notifications
```
Bottom-right position (desktop), top-center (mobile)
Duration: 4s auto-dismiss
Variants: success (green border), error (red border), info (blue border), warning (amber border)
```

### Navigation Sidebar (Desktop)
```
Width: 240px (expanded), 64px (collapsed)
bg-surface border-r border-border
Logo at top, nav items with icons + labels, user info at bottom
Active item: bg-primary/10 text-primary rounded-lg
```

## 5. Page Layouts

### Dashboard Layout (Desktop ≥ 1024px)
```
+------------------+---------------------------+-------------------+
| Sidebar 240px    |    Camera Preview         | Expression Panel  |
|                  |    (16:9 aspect ratio)    | 320px wide        |
| [Logo]           |    Face bounding box       |                   |
| [Dashboard]      |    overlay on stream      | [Expression Badge]|
| [History]        |                           | [Confidence Bar]  |
| [Settings]       |    Status: ● Active       | [Duration]        |
| [Admin?]         |                           |                   |
|                  +---------------------------+ [Suggestion Card] |
|                  | Quick Stats Bar           |                   |
|                  | Duration | Dominant Expr  |                   |
| [User]           +---------------------------+-------------------+
+------------------+
```

### Dashboard Layout (Mobile <768px)
```
+----------------------------------+
| Header: MoodLens         [Menu]  |
+----------------------------------+
|                                  |
|      Camera Preview              |
|      (Full width, 4:3)           |
|      Face overlay                |
|                                  |
+----------------------------------+
|  [Expression Badge] Confidence   |
|  Happy 😊          [====------]  |
|  91% confidence                  |
+----------------------------------+
| [Suggestion Card - Compact]      |
+----------------------------------+
+--+------+-------+---------+------+
|🏠 | 📊  |  ⚙️   |                |
|Home|History|Settings|             |
+--+------+-------+---------+------+
```

### Settings/Consent Layout
```
+------------------+----------------------------------------+
| Sidebar 240px    | Content Area                           |
|                  |                                        |
| General          | [Section Title]                        |
| Consent          |                                        |
| Integrations     | Toggle rows with description:          |
| Privacy          | [Camera Access            [Toggle ON]] |
| Danger Zone      | [Expression Processing    [Toggle ON]] |
|                  | [Mood Suggestions         [Toggle OFF]]|
|                  | [Music Integration        [Toggle OFF]]|
|                  |                                        |
+------------------+----------------------------------------+
```

## 6. Responsive Design Breakpoints

| Breakpoint | Class | Width |
|---|---|---|
| Mobile | sm | < 640px |
| Tablet | md | 640–767px |
| Laptop | lg | 768–1023px |
| Desktop | xl | ≥ 1024px |

**Mobile**: Full-width camera, stacked expression + suggestions, bottom nav bar
**Tablet**: Camera 60% width + expression panel 40%, sidebar collapses to icons-only
**Desktop**: Full sidebar (240px) + main content area with split layout

## 7. Accessibility (WCAG 2.1 AA)

- **Keyboard Navigation**: All interactive elements focusable; Tab order matches visual order; Skip-to-content link
- **Focus Indicators**: Visible focus ring (2px ring, primary color) on all interactive elements
- **ARIA Labels**: All icon buttons have aria-label; Camera preview has aria-live region for expression announcements
- **Color Independence**: Every expression has icon + text label; confidence shown as text percentage, not color only
- **Contrast Ratios**: All text combinations checked for ≥4.5:1 (AA) on both light and dark backgrounds
- **Screen Readers**: Expression updates announced via aria-live="polite" (not assertive to avoid constant interruption)
- **Reduced Motion**: `prefers-reduced-motion` media query respected; animations disabled for users who prefer it
- **Error Messages**: Descriptive, actionable error messages; not just "Invalid input"
- **Touch Targets**: Minimum 44x44px for all touch targets on mobile
- **Alt Text**: Meaningful alt text for all decorative and informational images

## 8. Animation Guidelines

- Use transitions sparingly and purposefully
- Duration: 150–300ms for UI state changes; 300–500ms for entrance/exit animations
- Easing: ease-out for entrances, ease-in for exits
- Expression badge transitions: smooth color + icon transition (200ms)
- Confidence bar: smooth width transition (300ms, ease-out)
- Suggestion card entrance: slide + fade (300ms from right)
- Suggestion card exit: fade out (200ms)
- Modal: scale 0.95→1.0 + fade (200ms)
- No looping animations except loading spinners
