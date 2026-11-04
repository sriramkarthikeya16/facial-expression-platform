# MoodLens — Product Requirements Document

## 1. Product Overview
- Product Name: MoodLens
- Tagline: "See what your face is saying."
- Summary: Real-time facial expression detection platform that captures webcam video, detects and tracks a single user's face, classifies visible facial expressions (7 classes), smooths predictions temporally, and surfaces privacy-respecting suggestions (music, wellness, food) with mandatory user confirmation for all consequential actions.
- Problem Statement: People often want ambient, low-friction awareness of their own emotional state without engaging in journaling or structured reflection. Existing emotion-detection tools are either clinically invasive, privacy-violating (cloud-based facial analysis), or inaccurate. There is no trustworthy, edge-first, consent-driven platform that turns real-time facial expressions into gentle, helpful suggestions.
- Proposed Solution: MoodLens runs all facial inference on-device (browser WebAssembly / ONNX Runtime Web), never sends raw video to the cloud, exposes a clear expression state with confidence scores, and uses a rule-based suggestion engine that always requires user confirmation before any consequential action.
- Core Value Proposition: "Know your expression. Control your experience. Keep your privacy."
- Target Audience: Wellness-conscious adults (18–45), remote workers, students, developers building emotion-aware applications
- Product Goals: (1) Deliver accurate real-time expression detection at ≥80% overall accuracy, (2) Achieve <100ms end-to-end browser pipeline latency, (3) Maintain user trust through radical transparency about what the system does and does not claim

## 2. User Personas

### Primary: Alex (End User, 28, remote worker)
- Background: Works from home, interested in wellness tech, has tried meditation apps
- Goals: Understand own emotional patterns across the workday; get gentle prompts when stressed
- Problems: Doesn't want intrusive notifications; distrusts cloud-based facial recognition
- Permissions: Full USER permissions; can grant/revoke individual feature consents

### Secondary: Jordan (Developer/Integrator, 32)
- Background: Full-stack developer building an adaptive learning LMS
- Goals: Integrate expression state via WebSocket/REST API to adapt content difficulty
- Permissions: DEVELOPER role — API key access, webhook configuration, telemetry dashboards

### Tertiary: System Admin
- Background: Platform operations
- Goals: Monitor system health, manage model versions, review audit logs
- Permissions: ADMIN role — full platform management

## 3. Features Table

| Feature | Description | Priority | User |
|---|---|---|---|
| Camera access & permission handling | Request, pause, resume camera; handle denial gracefully | Must Have | End User |
| Real-time face detection | Detect single face in video stream using lightweight model | Must Have | End User |
| Face tracking | Track face across frames without re-running full detector | Must Have | End User |
| Expression classification | 7-class (Happy/Sad/Angry/Fear/Disgust/Surprise/Neutral) + Unknown/Occluded/No Face | Must Have | End User |
| Confidence scoring | Per-prediction confidence 0.0–1.0 with quality assessment | Must Have | End User |
| Temporal smoothing | EMA + rolling window + hysteresis to prevent flicker | Must Have | End User |
| Live expression UI | Real-time expression badge + confidence bar + camera preview | Must Have | End User |
| Consent management | Granular per-feature consent (camera, processing, suggestions, integrations) | Must Have | End User |
| User registration/login | Email + password auth with JWT; email verification | Must Have | End User |
| Session management | Create/manage detection sessions; view session history | Must Have | End User |
| Suggestion engine | Rule-based suggestions triggered by persistent expression states | Must Have | End User |
| Music suggestion | Suggest Spotify or generic music when appropriate expression persists | Must Have | End User |
| Wellness/breathing exercises | Display breathing exercises for sustained negative expressions | Must Have | End User |
| User settings & preferences | Theme, quiet hours, suggestion frequency, preferred genres | Should Have | End User |
| Session history & expression timeline | Aggregated expression events per session with charts | Should Have | End User |
| Spotify OAuth integration | Full Spotify OAuth 2.0+PKCE connect + playback suggestions | Should Have | End User |
| Food suggestion deep links | Contextual food app deep links (not auto-order) | Nice to Have | End User |
| Trusted contacts / SOS confirmation | Emergency contact flow with explicit user confirmation | Nice to Have | End User |
| REST API for third-party integration | Authenticated REST endpoints returning expression state | Should Have | Developer |
| WebSocket real-time stream API | Real-time expression updates over WebSocket | Should Have | Developer |
| Admin dashboard | User management, model registry, audit logs | Should Have | Admin |
| Model versioning & registry | Track model versions, metrics, rollback capability | Should Have | Admin |
| Dark/light mode | Theme preference | Nice to Have | End User |
| Mobile-responsive layout | Full mobile responsiveness | Must Have | End User |
| A/B testing for suggestions | Experiment with different suggestion thresholds/wording | Future | Admin |
| Native mobile apps (Android/iOS) | Native inference on mobile | Future | End User |
| Multi-face support | Track and classify multiple faces simultaneously | Future | Developer |

## 4. User Stories

### Authentication
- As a new user, I want to register with email and password so I can access MoodLens.
- As a registered user, I want to log in securely so I can reach my dashboard.
- As a user, I want my session to persist across page refreshes so I don't need to log in repeatedly.

### Core Detection
- As a user, I want to grant camera access and see a live preview so I know the camera is working.
- As a user, I want to see my current facial expression displayed in real time so I have immediate feedback.
- As a user, I want to see a confidence score with each expression so I know how reliable the prediction is.
- As a user, I want the expression display to be stable (not flickering) so I can trust what I see.
- As a user, I want the system to show "No Face Detected" when I step away so I know it's behaving honestly.

### Suggestions
- As a user, I want to see a music suggestion card when I've looked sad for a while so I can choose to play something uplifting.
- As a user, I want to be able to dismiss suggestions so they don't distract me.
- As a user, I want the system to respect cooldown periods so I'm not bombarded with repeated suggestions.
- As a user, I want to confirm before any external app is opened so I stay in control.

### Privacy & Consent
- As a user, I want to know exactly what data is processed and stored so I can make informed choices.
- As a user, I want to enable/disable individual features (music suggestions, food suggestions, etc.) independently.
- As a user, I want to revoke consent at any time and have my data deleted.

### Settings & History
- As a user, I want to view my expression history from past sessions so I can spot patterns.
- As a user, I want to set quiet hours during which no suggestions appear.
- As a user, I want to choose preferred music genres for music suggestions.

## 5. Functional Requirements

- FR-001: The system SHALL request camera permission before activating the camera.
- FR-002: The system SHALL run all face detection and expression inference in the browser (WebAssembly/ONNX Runtime Web).
- FR-003: The system SHALL classify expressions into: Happy, Sad, Angry, Fear, Disgust, Surprise, Neutral.
- FR-004: The system SHALL produce Unknown state when confidence < 0.50.
- FR-005: The system SHALL produce Occluded state when face is partially blocked and tracking confidence is low.
- FR-006: The system SHALL produce No Face state when no usable face is detected.
- FR-007: The system SHALL apply temporal smoothing (EMA alpha=0.3 + hysteresis enter=0.75, exit=0.50) to predictions.
- FR-008: Suggestions SHALL only trigger after: confidence >= 0.75 AND expression persists >= 8 seconds (configurable per rule).
- FR-009: All suggestions SHALL include a dismiss action.
- FR-010: High-risk actions (emergency call, contact share) SHALL require explicit user confirmation within 30 seconds before expiry.
- FR-011: The system SHALL log all sensitive action events to audit_logs with hashed user ID.
- FR-012: Raw video frames SHALL NOT be transmitted to the backend.
- FR-013: The backend SHALL expose REST API at /api/v1/.
- FR-014: The backend SHALL expose WebSocket at /api/v1/ws/{session_id}.
- FR-015: All API endpoints except /auth/* SHALL require valid JWT access token.
- FR-016: The system SHALL implement role-based access control (USER, DEVELOPER, ADMIN, SUPPORT, SECURITY_AUDITOR).
- FR-017: Users SHALL be able to delete their account and all associated data.

## 6. Non-Functional Requirements

### Performance
- Browser inference pipeline: < 100ms end-to-end (target < 50ms on modern hardware)
- API response time: < 200ms p95 for standard endpoints
- WebSocket latency: < 50ms for expression update delivery
- Page load time: < 3s initial, < 1s subsequent (with code splitting)

### Security
- All passwords hashed with bcrypt (cost factor ≥ 12)
- JWT access tokens expire in 15 minutes; refresh tokens in 7 days
- All sensitive data encrypted at rest (AES-256 equivalent via PostgreSQL + platform storage)
- HTTPS required in production (TLS 1.2+)
- Rate limiting on auth endpoints (5 attempts per minute per IP)
- CORS restricted to allowed origins
- No sensitive data in logs

### Scalability
- Backend stateless (JWT-based), horizontally scalable
- Redis for WebSocket pub/sub and caching
- Database connection pooling via SQLAlchemy

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigable
- Screen reader compatible
- Color-independent expression indicators (icons + text + color)

### Privacy
- GDPR-aware: data minimization, purpose limitation, retention policies, deletion rights
- No raw biometric data stored
- Expression history stored only with explicit consent
- Data retention: session data 90 days (configurable)

## 7. MVP Scope

### Must Have (MVP)
- User registration, login, JWT auth
- Camera access + live face detection
- 7-class expression classification in browser
- Temporal smoothing + confidence display
- Live expression dashboard UI
- Basic suggestion engine (music + wellness)
- Granular consent management
- Session creation and basic history
- User settings (preferences)
- REST API for session + expression state
- WebSocket real-time stream

### Nice to Have (Post-MVP)
- Spotify OAuth integration
- Food deep links
- Rich session history charts
- Admin dashboard

### Future
- Native Android/iOS apps
- Multi-face support
- Trusted contacts / SOS
- Video meeting integration
- Model A/B testing

## 8. Out of Scope

- Clinical diagnosis of mental health conditions
- Lie detection
- Personality assessment
- Processing faces of other users without consent
- Automatic emergency calls without explicit confirmation
- Real-time video storage or cloud-side video processing
- Driver monitoring system
- Workplace surveillance

## 9. Success Metrics

| Metric | Target |
|---|---|
| Expression classification accuracy | ≥ 80% overall, ≥ 0.75 Macro F1 |
| Browser pipeline latency (p50) | < 50ms |
| Browser pipeline latency (p95) | < 100ms |
| Suggestion acceptance rate | ≥ 30% |
| False suggestion rate | ≤ 5% |
| User disable rate (stopped suggestions) | ≤ 15% |
| Crash-free sessions | ≥ 99% |
| API response time (p95) | < 200ms |
| User registration completion rate | ≥ 85% |
| Consent grant rate (expression processing) | ≥ 90% |
