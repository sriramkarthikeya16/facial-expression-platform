# MoodLens — Application Flow

## 1. Page Inventory

### Public Routes (unauthenticated)

#### `/` — Landing Page
- Purpose: Introduce MoodLens, explain privacy-first approach, drive registration
- Components: Hero section, feature highlights, privacy statement, CTA buttons
- Actions: Navigate to /register or /login
- No API calls required

#### `/login` — Login
- Purpose: Authenticate existing users
- Components: Email input, password input, submit button, forgot password link, register link
- API calls: POST /api/v1/auth/login
- Success: Redirect to /dashboard
- Failure: Show inline error message

#### `/register` — Registration
- Purpose: Create new user account
- Components: Username, email, password, confirm password inputs; terms acceptance checkbox
- API calls: POST /api/v1/auth/register
- Success: Redirect to /dashboard (or /onboarding for consent setup)
- Failure: Show field-level validation errors

### Protected Routes (require JWT)

#### `/dashboard` — Main Expression Dashboard
- Purpose: Live expression detection + real-time feedback + suggestions
- User role: USER
- Components:
  - CameraPreview (getUserMedia, face bounding box overlay)
  - ExpressionBadge (current expression + emoji)
  - ConfidenceBar (0–100% visualization)
  - ExpressionLabel (e.g., "High-confidence happy expression pattern")
  - SuggestionCard (dismissible action card)
  - SessionControls (start/stop session)
  - QuickStats (session duration, dominant expression)
- Actions: Start/stop camera, grant/deny suggestions, start session, view session stats
- API calls:
  - POST /api/v1/sessions (on session start)
  - POST /api/v1/sessions/{id}/events (aggregate expression events)
  - WebSocket /api/v1/ws/{session_id} (real-time bidirectional)
  - POST /api/v1/suggestions/{id}/respond
- On unmount: Graceful session end + WebSocket close

#### `/history` — Session History
- Purpose: Review past sessions and expression timelines
- Components: SessionList, SessionDetail, ExpressionTimelineChart (Recharts)
- API calls:
  - GET /api/v1/sessions (paginated list)
  - GET /api/v1/sessions/{id}/events

#### `/settings` — User Settings
- Purpose: General preferences
- Sub-routes:
  - `/settings` — Profile, theme, notification settings
  - `/settings/consent` — Granular feature consents
  - `/settings/integrations` — Spotify, other integrations
  - `/settings/privacy` — Data export, account deletion
  - API calls:
  - GET/PATCH /api/v1/users/me
  - GET/PATCH /api/v1/users/me/preferences
  - GET/POST/DELETE /api/v1/consents
  - GET /api/v1/integrations
  - POST /api/v1/integrations/spotify/connect
  - DELETE /api/v1/users/me (account deletion)

#### `/admin` — Admin Panel (ADMIN role only)
- Purpose: Platform management
- Components: UsersList, ModelRegistry, AuditLogViewer, SystemMetrics
- API calls: GET /api/v1/admin/* endpoints

## 2. Navigation

### Desktop (≥768px)
- Left sidebar (collapsible): Logo, Dashboard, History, Settings, Admin (if ADMIN role)
- Top header: User avatar/name, logout button, theme toggle
- Active route highlighted in sidebar

### Mobile (<768px)
- Bottom navigation bar: Dashboard icon, History icon, Settings icon
- Top header: App name, hamburger menu
- Full-screen camera on dashboard

## 3. Authentication Flow

```
Visitor hits /
    ↓
[Unauthenticated] → /register or /login
    ↓
POST /auth/register or /auth/login
    ↓
Backend: validate → hash/verify → create tokens
    ↓
Response: { access_token } + Set-Cookie: refresh_token (httpOnly)
    ↓
Frontend: store access_token in Zustand memory state
    ↓
Redirect → /dashboard
    ↓
All subsequent requests: Authorization: Bearer {access_token}
    ↓
On 401 response: POST /auth/refresh (browser sends httpOnly cookie automatically)
    ↓
New access_token → retry original request
    ↓
On logout: POST /auth/logout → revoke refresh token → clear cookie → redirect /
```

## 4. Core User Journeys

### Journey A — First-Time User Onboarding

1. User visits `/`, reads product description
2. Clicks "Get Started" → `/register`
3. Enters username, email, password → submits
4. Frontend: POST /api/v1/auth/register
5. Backend: validates, hashes password, creates user, issues tokens
6. Frontend: stores access token, sets refresh cookie
7. Redirect to `/dashboard` with consent dialog overlay
8. User grants consent for: camera_access, expression_processing, mood_suggestions
9. Frontend: POST /api/v1/consents for each consent type
10. Consent dialog closes, user sees dashboard with camera prompt
11. User clicks "Enable Camera"
12. Browser requests camera permission → user allows
13. Camera preview appears, face detection initializes
14. First expression detected and displayed

### Journey B — Live Expression Detection Session

1. User opens `/dashboard` (already authenticated)
2. Camera is active (or user clicks "Start Camera")
3. Frontend: POST /api/v1/sessions → receives session_id
4. Frontend: Opens WebSocket connection to /api/v1/ws/{session_id}
5. WebSocket message: `{type: "subscribe", session_id}`
6. ML pipeline starts: Camera → FaceDetector → FaceTracker → ExpressionModel → TemporalSmoother
7. Every ~100ms: expression state updated in Zustand store
8. UI renders: ExpressionBadge updates, ConfidenceBar animates
9. After 8 seconds of high-confidence "Sad" expression:
   - Suggestion engine triggers in browser
   - SuggestionCard appears: "You've been looking a bit down. Want some music?"
   - Frontend sends WebSocket message: `{type: "suggestion_event", ...}`
10. User clicks "Play Music" → browser opens Spotify (if connected) or music search
11. User clicks "Dismiss" → SuggestionCard disappears; 5-minute cooldown starts
12. User ends session: Camera stops, WebSocket closes, POST session end to backend

### Journey C — Suggestion Confirmation Flow (High-Risk)

1. Fear expression detected at confidence 0.85, persisting > 15 seconds
2. Safety UI appears (higher-priority overlay):
   - "You appear distressed. Need help?"
   - Buttons: [Call Favorite Contact] [Breathing Exercise] [I'm OK]
3. User taps "Breathing Exercise" → wellness resource opens in side panel
4. If user taps "Call Favorite Contact":
   - Secondary confirmation dialog: "Call [Name]?"
   - Countdown: 30 seconds to confirm or cancel
   - User taps Confirm → `tel:` URL opened (user's dialer, not auto-call)
   - Audit log entry created
5. If user taps "I'm OK" → overlay dismissed; 15-minute cooldown

## 5. WebSocket Lifecycle

```
Client: WebSocket connect wss://api/v1/ws/{session_id}
    ↓
Client sends: {type: "auth", token: access_token}
    ↓
Server: validates token → confirms session ownership
    ↓
Server sends: {type: "ready", session_id}
    ↓
[Client sends expression events locally from ML pipeline]
[Client may send: {type: "expression_update", expression, confidence, ...}]
    ↓
Server broadcasts to developer subscribers: {type: "expression_update", ...}
    ↓
Server may send: {type: "suggestion", suggestion_id, category, ...}
    ↓
Client sends: {type: "suggestion_response", suggestion_id, decision: "accepted"}
    ↓
Client sends: {type: "ping"} every 30s
    ↓
Server sends: {type: "pong"}
    ↓
On session end:
Client sends: {type: "session_end"}
Client closes WebSocket
```

## 6. Edge Cases

### No Face Detected
- UI: ExpressionBadge shows "No Face" with camera icon
- No suggestions triggered
- Session continues (face may return)

### Low Confidence (Unknown)
- UI: ExpressionBadge shows "?" with muted styling
- No suggestions triggered
- UI hint: "Move closer to the camera" if quality < 0.5

### Camera Permission Denied
- UI: Full-screen error state with instructions to enable in browser settings
- No auto-retry (respect browser policy)
- Link to browser settings help

### Camera Permission Revoked During Session
- Camera stream error caught by getUserMedia
- Session paused, error state shown
- User prompted to re-grant permission

### Network Failure
- REST calls: Axios retry x2 with exponential backoff
- WebSocket: Auto-reconnect x3 with 2s/5s/10s backoff
- If reconnect fails: "Offline mode" — ML pipeline continues locally, events queued
- Queued events flushed on reconnect

### Session Expired (JWT)
- 401 response intercepted by Axios
- Automatic token refresh via httpOnly cookie
- If refresh fails: Redirect to /login with "session expired" message

### Multiple Faces
- Face detector returns multiple detections
- System selects face with highest quality_score (primary face)
- UI hint: "Multiple faces detected — using primary face"
- No multi-face analysis in MVP

### Poor Lighting
- quality_score < 0.4 detected by expression model
- UI hint card: "Poor lighting detected. Try moving to a brighter area."
- No suggestions triggered while quality < 0.4

### Suggestion Cooldown Active
- Suggestion engine checks cooldown state before triggering
- No duplicate suggestions within cooldown window (300s default for music, 900s for SOS)

### Empty History
- /history shows empty state illustration with call-to-action
- "Start your first session on the Dashboard"
