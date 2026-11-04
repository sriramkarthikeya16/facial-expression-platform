# MoodLens — Technical Requirements Document

## 1. Architecture Overview

Hybrid edge+cloud architecture:
- **Edge (browser)**: All facial inference (face detection, landmark extraction, expression classification, temporal smoothing) runs in the browser via ONNX Runtime Web (WebAssembly). Raw camera frames NEVER leave the browser.
- **Cloud (backend)**: User management, session metadata, aggregated expression events, suggestions, integrations, WebSocket relay, model registry.

```mermaid
graph TB
    subgraph Browser ["Browser / Web Client"]
        CAM["Camera (getUserMedia)"]
        FD["Face Detector (ONNX/MediaPipe)"]
        FT["Face Tracker"]
        EM["Expression Model (ONNX)"]
        TS["Temporal Smoother"]
        SE["Suggestion Engine"]
        UI["React UI"]
        CAM --> FD --> FT --> EM --> TS --> SE --> UI
    end

    subgraph Backend ["FastAPI Backend"]
        AUTH["Auth Service"]
        SESSION["Session Service"]
        EVENTS["Expression Events"]
        SUGGEST["Suggestion Service"]
        WS["WebSocket Manager"]
        INTEG["Integration Service"]
        AUDIT["Audit Logger"]
    end

    subgraph Data ["Data Layer"]
        PG[("PostgreSQL 15")]
        REDIS[("Redis 7")]
    end

    Browser -- "REST /api/v1/" --> Backend
    Browser -- "WebSocket wss://" --> WS
    Backend --> Data
    WS --> REDIS
```

## 2. Frontend Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | React 18 + TypeScript | Mature ecosystem, strong typing, excellent webcam library support |
| Build Tool | Vite 5 | Fast HMR, excellent WebAssembly support for ONNX |
| Styling | Tailwind CSS v3 | Utility-first, consistent design system, tree-shakeable |
| State Management | Zustand | Lightweight, minimal boilerplate, perfect for expression state |
| Server State | TanStack Query (React Query) v5 | Caching, background refetch, mutation handling |
| Forms | React Hook Form + Zod | Performance, type-safe validation |
| HTTP Client | Axios | Interceptors for JWT refresh |
| Charts | Recharts | React-native charting for expression history |
| ML Runtime | onnxruntime-web | ONNX model inference in browser via WebAssembly/WebGL |
| Face Detection | @mediapipe/face_detection or face-api.js | Lightweight browser face detection |
| Icons | Lucide React | Consistent icon set |
| Notifications | react-hot-toast | Non-intrusive toast notifications |
| Router | React Router v6 | Standard SPA routing |

## 3. Backend Stack

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | Python 3.11 | Latest stable, excellent ML ecosystem |
| Framework | FastAPI 0.110+ | Async, auto-docs, WebSocket native, Pydantic integration |
| ORM | SQLAlchemy 2.0 (async) | Modern async SQLAlchemy with type safety |
| Migrations | Alembic | Industry standard for SQLAlchemy migrations |
| Validation | Pydantic v2 | Ultra-fast validation, FastAPI native |
| Auth | python-jose[cryptography] + bcrypt | JWT generation, bcrypt hashing |
| Redis | redis-py (async) | WebSocket pub/sub, session cache, rate limiting |
| WebSocket | FastAPI WebSocket | Native WebSocket support |
| CORS | fastapi.middleware.cors | CORS configuration |
| Rate Limiting | slowapi | FastAPI-compatible rate limiting |
| Logging | structlog | Structured logging for production |
| Testing | pytest + pytest-asyncio + httpx | Async test support |
| Database Driver | asyncpg | Async PostgreSQL driver |

## 4. ML Stack

| Component | Technology | Rationale |
|---|---|---|
| Training Framework | PyTorch 2.x | Industry standard, ONNX export support |
| Data Loading | torchvision + Albumentations | Fast augmentation pipeline |
| Face Detection (training) | OpenCV + MTCNN/RetinaFace | Detect/align faces from raw dataset images |
| Model Architecture | MobileNetV3-Large | Tier B balanced model, 5-30MB, good accuracy/latency |
| Export | torch.onnx.export | ONNX format for cross-platform deployment |
| Optimization | ONNX quantization (INT8/FP16) | Browser WASM performance |
| Calibration | Temperature scaling | Confidence calibration |
| Metrics | scikit-learn | Classification report, confusion matrix |
| Visualization | matplotlib, seaborn | Training curves, confusion matrices |
| Browser Runtime | onnxruntime-web 1.18+ | WebAssembly + WebGL backend |

## 5. Database

- **Technology**: PostgreSQL 15
- **Why**: ACID compliance, JSONB for flexible metadata, robust indexing, mature ecosystem, excellent SQLAlchemy support, availability on all hosting platforms
- **Connection**: asyncpg driver with SQLAlchemy 2.0 async
- **Connection Pool**: 5 min / 20 max connections
- **Migrations**: Alembic with versioned migration files
- **Backup**: pg_dump scheduled daily; WAL archiving for point-in-time recovery in production

## 6. Authentication

- **Registration**: Email + username + password → bcrypt hash (cost=12) → store in users table
- **Login**: Email + password → verify hash → issue access token (JWT, 15 min) + refresh token (JWT, 7 days, stored hashed in DB)
- **Token Storage**: Access token in memory (Zustand); refresh token in httpOnly cookie
- **Refresh**: POST /auth/refresh with refresh cookie → new access token
- **Logout**: Revoke refresh token in DB + clear cookie
- **Roles**: USER, DEVELOPER, ADMIN, SUPPORT, SECURITY_AUDITOR
- **OAuth (Spotify)**: Authorization Code + PKCE flow; tokens stored encrypted in integrations table

## 7. Hosting Recommendations

| Environment | Recommendation |
|---|---|
| Development | Docker Compose (local): backend + PostgreSQL + Redis |
| Staging | Single-instance Docker on Render.com or Railway.app |
| Production | Docker on Render/Railway or self-hosted VPS; managed PostgreSQL (Supabase, Neon, or RDS); managed Redis (Upstash or Redis Cloud) |

## 8. Third-Party Services

| Service | Purpose | Free/Paid | Required? |
|---|---|---|---|
| Spotify Web API | OAuth music suggestions | Free tier (OAuth required) | Optional |
| SMTP (Resend/SendGrid) | Email verification, password reset | Free tier available | Should Have |
| Sentry | Error monitoring | Free tier available | Should Have |
| Cloudflare CDN | Static asset delivery | Free tier | Nice to Have |

## 9. Required Libraries

### Backend (requirements.txt)
```
fastapi==0.110.0
uvicorn[standard]==0.27.0
sqlalchemy[asyncio]==2.0.25
alembic==1.13.1
asyncpg==0.29.0
pydantic[email]==2.5.3
python-jose[cryptography]==3.3.0
bcrypt==4.1.2
redis[asyncio]==5.0.1
python-multipart==0.0.6
httpx==0.26.0
structlog==24.1.0
slow-api==0.6.2
python-dotenv==1.0.0
```

### Frontend (package.json dependencies)
```
react 18.x
react-dom 18.x
typescript 5.x
vite 5.x
@vitejs/plugin-react
tailwindcss 3.x
postcss
autoprefixer
zustand 4.x
@tanstack/react-query 5.x
react-router-dom 6.x
axios 1.x
react-hook-form 7.x
zod 3.x
recharts 2.x
lucide-react
react-hot-toast 2.x
onnxruntime-web 1.18.x
@mediapipe/face_detection
```

### ML (ml/requirements.txt)
```
torch>=2.1.0
torchvision>=0.16.0
onnx>=1.15.0
onnxruntime>=1.17.0
opencv-python>=4.8.0
albumentations>=1.3.1
scikit-learn>=1.3.0
matplotlib>=3.7.0
seaborn>=0.13.0
numpy>=1.24.0
pandas>=2.0.0
tqdm>=4.65.0
pillow>=10.0.0
```

## 10. Environment Variables (.env.example)

```env
# Application
APP_NAME=MoodLens
APP_ENV=development
DEBUG=true
SECRET_KEY=change-this-to-a-long-random-secret-key-in-production

# Database
DATABASE_URL=postgresql+asyncpg://moodlens:password@localhost:5432/moodlens
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=change-this-jwt-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Spotify OAuth (optional)
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SPOTIFY_REDIRECT_URI=http://localhost:5173/integrations/spotify/callback

# Email (optional, for verification)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
FROM_EMAIL=noreply@moodlens.app

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
AUTH_RATE_LIMIT_PER_MINUTE=5

# Model
MODEL_PATH=./ml/models/expression_model.onnx
MODEL_VERSION=1.0.0

# Frontend (Vite)
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_APP_ENV=development
VITE_SPOTIFY_CLIENT_ID=your-spotify-client-id
```

## 11. Performance Targets

| Component | Target (p50) | Target (p95) |
|---|---|---|
| Browser face detection | < 20ms | < 40ms |
| Browser expression inference | < 20ms | < 40ms |
| Browser temporal processing | < 5ms | < 10ms |
| End-to-end browser pipeline | < 50ms | < 100ms |
| API response (standard) | < 100ms | < 200ms |
| WebSocket expression update | < 50ms | < 100ms |
| Page load (initial) | < 3s | < 5s |
| Page load (subsequent) | < 1s | < 2s |

## 12. Security Requirements

- Password hashing: bcrypt, cost factor ≥ 12
- JWT: HS256, short expiry (15 min access / 7 day refresh)
- HTTPS: Required in production (TLS 1.2+)
- CORS: Strict allowlist
- Rate limiting: Auth endpoints 5/min/IP; API endpoints 60/min/user
- Input validation: Pydantic v2 on all endpoints
- SQL injection: Prevented by SQLAlchemy parameterized queries
- XSS: React escapes by default; CSP headers
- No raw biometric data in logs, responses, or telemetry
- Audit logging for all sensitive actions
- Secrets via environment variables only
