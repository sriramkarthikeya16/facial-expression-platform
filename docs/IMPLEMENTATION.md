# MoodLens — Implementation Plan

## Project Structure
```
facial-expression-platform/
├── README.md
├── .env.example
├── .gitignore
├── docker-compose.yml
├── docs/
│   ├── PRD.md
│   ├── TRD.md
│   ├── APP_FLOW.md
│   ├── DESIGN.md
│   ├── DATABASE.md
│   └── IMPLEMENTATION.md
├── dataset/  (existing)
│   ├── raw/
│   ├── processed/
│   └── splits/
├── ml/
│   ├── preprocessing/
│   │   ├── prepare_datasets.py
│   │   └── augmentation.py
│   ├── training/
│   │   ├── train.py
│   │   ├── model.py
│   │   └── config.py
│   ├── evaluation/
│   │   ├── evaluate.py
│   │   └── calibration.py
│   ├── export/
│   │   └── export_onnx.py
│   ├── models/
│   │   └── .gitkeep
│   └── requirements.txt
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── dependencies.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   ├── session.py
│   │   │   └── init_db.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── session.py
│   │   │   ├── expression.py
│   │   │   ├── suggestion.py
│   │   │   └── integration.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   ├── session.py
│   │   │   └── expression.py
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── router.py
│   │   │   │   ├── auth.py
│   │   │   │   ├── users.py
│   │   │   │   ├── sessions.py
│   │   │   │   ├── suggestions.py
│   │   │   │   ├── consents.py
│   │   │   │   ├── integrations.py
│   │   │   │   └── admin.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── user_service.py
│   │   │   ├── session_service.py
│   │   │   ├── suggestion_service.py
│   │   │   └── audit_service.py
│   │   └── websocket/
│   │       ├── manager.py
│   │       └── handlers.py
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_sessions.py
│   │   └── test_suggestions.py
│   ├── requirements.txt
│   └── alembic.ini
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # Reusable UI components
│   │   │   ├── camera/      # Camera preview, controls
│   │   │   ├── expression/  # Expression badge, confidence bar
│   │   │   ├── suggestions/ # Suggestion card, SOS overlay
│   │   │   ├── layout/      # Sidebar, header, nav
│   │   │   └── charts/      # Recharts wrappers
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── HistoryPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── AdminPage.tsx
│   │   ├── hooks/
│   │   │   ├── useCamera.ts
│   │   │   ├── useExpression.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── useAuth.ts
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   ├── expressionStore.ts
│   │   │   └── sessionStore.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── authApi.ts
│   │   │   └── sessionApi.ts
│   │   ├── ml/
│   │   │   ├── faceDetector.ts
│   │   │   ├── expressionClassifier.ts
│   │   │   ├── temporalSmoother.ts
│   │   │   └── suggestionEngine.ts
│   │   ├── types/
│   │   │   ├── expression.ts
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   └── models/       # ONNX model files
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
└── scripts/
    ├── setup.sh
    └── seed_db.py
```

## PHASE 1 — Project Setup

### Tasks
- [x] Inspect existing repository (done: dataset directory found with FER-2013, RAF-DB, CK+, Natural Human Face)
- [ ] Create docs directory and write all planning documents
- [ ] Create root-level files: README.md, .env.example, .gitignore, docker-compose.yml
- [ ] Initialize backend: Python virtualenv, requirements.txt, FastAPI app skeleton
- [ ] Initialize frontend: Vite + React + TypeScript + Tailwind CSS
- [ ] Initialize ML environment: requirements.txt
- [ ] Configure Git (initial commit structure)

### Done Criteria
- `docker compose up` starts PostgreSQL and Redis successfully
- Backend starts: `uvicorn app.main:app` returns 200 on GET /
- Frontend starts: `npm run dev` opens Vite dev server
- ML environment: `python ml/training/train.py --help` shows help text

## PHASE 2 — Database & Migrations

### Tasks
- [ ] Install PostgreSQL via Docker Compose (service: db)
- [ ] Install Redis via Docker Compose (service: redis)
- [ ] Configure SQLAlchemy async engine in backend/app/db/session.py
- [ ] Create all SQLAlchemy models in backend/app/models/
- [ ] Initialize Alembic: `alembic init alembic`
- [ ] Write initial migration: `alembic revision --autogenerate -m "initial_schema"`
- [ ] Run migration: `alembic upgrade head`
- [ ] Verify schema with `\d` in psql
- [ ] Create seed data script: admin user, sample model version

### Done Criteria
- `alembic upgrade head` runs without errors on clean database
- All 14 tables created with correct columns, constraints, and indexes
- Seed script creates test users and model version entry

## PHASE 3 — Authentication

### Tasks
- [ ] Implement password hashing in core/security.py (bcrypt, cost=12)
- [ ] Implement JWT creation/verification in core/security.py
- [ ] Create auth schemas (RegisterRequest, LoginRequest, TokenResponse)
- [ ] Create AuthService (register, login, refresh, logout)
- [ ] Create auth API router: POST /auth/register, /auth/login, /auth/refresh, /auth/logout
- [ ] Implement get_current_user dependency
- [ ] Implement role-based dependency (require_role)
- [ ] Add rate limiting on /auth/login (5/min/IP)
- [ ] Write unit tests for auth (test_auth.py)

### Done Criteria
- Register → Login → Access protected endpoint → Refresh → Logout all work end-to-end
- Rate limiting correctly blocks after 5 failed attempts
- bcrypt hash stored, never plaintext
- pytest test_auth.py passes

## PHASE 4 — ML Pipeline

### Tasks

#### 4.1 Dataset Preprocessing
- [ ] Write preprocessing/prepare_datasets.py:
  - Load FER-2013 (folder structure: train/test per class)
  - Load RAF-DB (CSV labels + DATASET folder structure)
  - Load CK+48 (folder structure)
  - Load Natural Human Face Images (folder structure)
  - Normalize class labels across datasets (all to: happy, sad, angry, fear, disgust, surprise, neutral)
  - Skip classes not in target taxonomy (contempt)
  - Subject-based train/val/test split (70/15/15)
  - Save split manifests as CSV to dataset/splits/
  - Report class distribution after merging

#### 4.2 Model Training
- [ ] Write training/model.py: MobileNetV3-Large pretrained on ImageNet, replace classifier head with 7-class linear
- [ ] Write training/train.py:
  - WeightedRandomSampler for class imbalance
  - Weighted cross-entropy loss
  - Albumentations augmentation pipeline
  - Adam optimizer, ReduceLROnPlateau scheduler
  - Early stopping (patience=10)
  - Save best checkpoint
  - Training curves to evaluation/plots/
- [ ] Write evaluation/evaluate.py:
  - Accuracy, balanced accuracy, Macro F1, Weighted F1
  - Per-class recall
  - Confusion matrix plot
  - Calibration curve (ECE)

#### 4.3 Calibration
- [ ] Write evaluation/calibration.py: temperature scaling

#### 4.4 ONNX Export
- [ ] Write export/export_onnx.py:
  - Load best checkpoint
  - Apply temperature scaling
  - Export to ONNX (opset 17)
  - Verify ONNX model output matches PyTorch
  - Quantize to FP16 (onnxruntime quantization)
  - Save to ml/models/expression_model.onnx
  - Copy to frontend/public/models/expression_model.onnx

### Done Criteria
- Training completes without errors
- Validation accuracy ≥ 75% (targeting ≥80%)
- Macro F1 ≥ 0.70
- ONNX export verified: outputs match PyTorch within tolerance
- Model file at frontend/public/models/expression_model.onnx

## PHASE 5 — Backend API

### Tasks
- [ ] Set up FastAPI app with CORS, rate limiting, structured logging
- [ ] Implement all API routers from DATABASE.md API Specification section
- [ ] Implement WebSocket manager (Redis pub/sub for multi-instance support)
- [ ] Implement WebSocket handlers (auth, expression_update, suggestion_response, ping)
- [ ] Implement suggestion rule engine in services/suggestion_service.py
- [ ] Implement audit logging in services/audit_service.py
- [ ] Error handling: global exception handlers returning structured JSON errors
- [ ] Health check endpoint: GET /health
- [ ] OpenAPI docs auto-generated at /docs (dev only)

### Done Criteria
- All API endpoints return correct responses with correct status codes
- WebSocket connection lifecycle works end-to-end
- Unauthorized requests return 401/403
- Validation errors return 422 with field-level details
- Rate limiting works on auth endpoints

## PHASE 6 — Frontend Foundation

### Tasks
- [ ] Set up Vite + React + TypeScript project
- [ ] Configure Tailwind CSS with custom design tokens
- [ ] Set up React Router v6 with protected route wrapper
- [ ] Create Zustand stores: authStore, expressionStore, sessionStore
- [ ] Create Axios instance with JWT interceptor (auto-refresh on 401)
- [ ] Build reusable UI components: Button, Input, Card, Modal, Toast
- [ ] Build layout components: Sidebar, Header, MainLayout
- [ ] Build auth pages: LandingPage, LoginPage, RegisterPage
- [ ] Connect auth pages to API: login, register, logout flows

### Done Criteria
- App starts, routing works, login/register functional
- JWT stored in memory (Zustand), refresh cookie set by backend
- Protected routes redirect unauthenticated users to /login
- Mobile responsive layout works

## PHASE 7 — Core ML Features (Browser)

### Tasks
- [ ] Implement ml/faceDetector.ts:
  - Use @mediapipe/face_detection or face-api.js
  - Return: bounding box, face_id, tracking_confidence
- [ ] Implement ml/expressionClassifier.ts:
  - Load ONNX model using onnxruntime-web
  - Preprocess face crop (112x112 RGB, normalize)
  - Run inference, return expression + confidence array
- [ ] Implement ml/temporalSmoother.ts:
  - EMA (alpha=0.3) over confidence scores per class
  - Hysteresis (enter=0.75, exit=0.50)
  - Persistence tracking (min 8s for suggestions)
  - Unknown state when max confidence < 0.50
- [ ] Implement ml/suggestionEngine.ts:
  - Rule evaluation against temporal state
  - Cooldown management per rule
  - Suggestion trigger events
- [ ] Build hooks/useCamera.ts: getUserMedia, stream management, error handling
- [ ] Build hooks/useExpression.ts: orchestrate detector → classifier → smoother pipeline
- [ ] Build hooks/useWebSocket.ts: connect, auth, message handling, reconnect logic

### Done Criteria
- Camera preview renders with face bounding box overlay
- Expression classification updates in real time
- Temporal smoother prevents rapid flickering
- Hysteresis prevents rapid state switching
- Unknown state shown when confidence < 0.50

## PHASE 8 — Dashboard UI

### Tasks
- [ ] Build DashboardPage.tsx:
  - Camera preview panel with CameraPreview component
  - ExpressionPanel with ExpressionBadge + ConfidenceBar + duration
  - SuggestionCard component (dismissible, animated)
  - SessionControls (start/stop)
  - QuickStats bar
- [ ] Build ExpressionBadge component (icon + label + color per expression)
- [ ] Build ConfidenceBar component (animated width transition)
- [ ] Build SuggestionCard component (category-appropriate icon, action + dismiss)
- [ ] Build CameraPreview component (video element + canvas overlay for face box)
- [ ] Connect dashboard to backend: create session on start, post events every 30s, end session on stop
- [ ] Connect WebSocket for real-time suggestion delivery
- [ ] Handle all edge cases: no face, low confidence, poor lighting, camera denied

### Done Criteria
- Full dashboard renders and works on desktop and mobile
- Expression updates in real time
- Suggestions appear after configured persistence duration
- All edge cases handled with appropriate UI messages

## PHASE 9 — Settings, History, Consent

### Tasks
- [ ] Build HistoryPage.tsx with session list + expression timeline chart (Recharts)
- [ ] Build SettingsPage.tsx with tabs: Profile, Consent, Integrations, Privacy
- [ ] Build ConsentSettings component with toggle rows per feature
- [ ] Build IntegrationsSettings component with Spotify connect/disconnect
- [ ] Implement Spotify OAuth flow (auth URL → popup redirect → callback → token storage)
- [ ] Build DangerZone: account deletion with password confirmation

### Done Criteria
- History page loads and displays paginated session list
- Consent toggles persist to backend
- Spotify connect flow completes successfully
- Account deletion flow works with confirmation dialog

## PHASE 10 — UI Polish

### Tasks
- [ ] Dark/light mode toggle with system preference detection
- [ ] Smooth transitions on expression changes
- [ ] Skeleton loaders for all loading states
- [ ] Empty states for history, suggestions
- [ ] Error boundaries around ML and camera components
- [ ] Toast notifications for all async operations
- [ ] Accessibility audit (keyboard nav, ARIA, contrast ratios)
- [ ] Mobile responsive polish pass

## PHASE 11 — Testing

### Backend Tests
- [ ] Unit tests: security functions, suggestion engine rules
- [ ] API tests: all auth endpoints, session endpoints, suggestion endpoints
- [ ] Authorization tests: cross-user access denied, role escalation prevented
- [ ] WebSocket tests: connection, auth, message handling

### ML Tests
- [ ] Unit tests: preprocessing functions, augmentation pipeline
- [ ] Model output tests: correct output shape, value range
- [ ] Temporal smoother tests: EMA correctness, hysteresis logic

### Frontend Tests
- [ ] Unit tests: temporalSmoother, suggestionEngine rules
- [ ] Component tests: ExpressionBadge, ConfidenceBar, SuggestionCard

## PHASE 12 — Security Hardening

### Tasks
- [ ] Security headers (X-Content-Type-Options, X-Frame-Options, CSP)
- [ ] CORS strict configuration
- [ ] Input sanitization review
- [ ] Rate limiting verification
- [ ] Audit log completeness check
- [ ] Dependency vulnerability audit (pip-audit, npm audit)
- [ ] Sensitive data in logs audit (ensure no tokens, passwords, biometrics)

## PHASE 13 — Deployment

### Tasks
- [ ] Production Dockerfile for backend
- [ ] Production docker-compose.yml (or Railway/Render deployment config)
- [ ] Production environment variables documentation
- [ ] Alembic migration in deployment pipeline
- [ ] Frontend production build (npm run build)
- [ ] Static asset serving configuration
- [ ] HTTPS configuration
- [ ] Health check endpoints verified
- [ ] README.md with complete setup and deployment instructions

## Commands Reference

### Development Setup
```bash
# Start infrastructure
docker compose up -d db redis

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python scripts/seed_db.py
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

# ML Training
cd ml
pip install -r requirements.txt
python preprocessing/prepare_datasets.py
python training/train.py
python evaluation/evaluate.py
python export/export_onnx.py
```

### Testing
```bash
# Backend tests
cd backend && pytest tests/ -v

# Frontend tests
cd frontend && npm test

# ML tests
cd ml && pytest tests/ -v
```

### Production Build
```bash
# Build frontend
cd frontend && npm run build

# Run backend (production)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Run migrations (production)
alembic upgrade head
```
