# MoodLens Security Threat Model & Attack Tree Analysis

**Document Version:** 1.0  
**Methodology:** Microsoft STRIDE Threat Modeling Framework  
**Scope:** Client WASM Inference, REST API Gateway, WebSocket Relayer, OAuth Integrations, Safety Engine  

---

## 1. System Architecture & Trust Boundaries

```text
                     [ User Camera / Video ]
                                │
                        (Trust Boundary 1)
                                ▼
                     [ React Browser WASM ]
                                │
                        (Trust Boundary 2 - TLS 1.3 / OAuth PKCE)
                                ▼
                     [ FastAPI API Gateway ]
                          │           │
                          ▼           ▼
                   [ PostgreSQL ]  [ Redis ]
```

---

## 2. STRIDE Threat Matrix & Mitigations

| Category | Threat Description | Severity | Implemented Mitigation |
| :--- | :--- | :---: | :--- |
| **Spoofing** | Presentation attack using printed photo or deepfake video to spoof emotions | Medium | Temporal smoothing (EMA), glabella/oral aperture feature validation, and strict prohibition of autonomous actions. |
| **Tampering** | Modification of model weights or ONNX file in browser memory | High | Subresource Integrity (SRI) checks, model SHA-256 hash validation against `/api/v1/models` registry. |
| **Repudiation** | User denies triggering an external call or emergency dialer | Medium | SHA-256 anonymized audit logging recording user confirmation timestamp and action token ID. |
| **Information Disclosure** | Interception of camera stream or biometric templates | Critical | Edge-first architecture: Frames never leave client memory; zero biometric embeddings generated or stored. |
| **Denial of Service** | Flooding API with batch expression telemetry or rapid session creation | High | IP and user rate limiting (60 req/min for API, 5 req/min for auth), max 100 events per batch limit. |
| **Elevation of Privilege** | Normal user calling Admin endpoints or triggering unconsented actions | Critical | Role-Based Access Control (RBAC) + cryptographic Action Authorization Tokens (TTL 60s) with scope checking. |

---

## 3. High-Stakes Action Attack Trees

### Attack Scenario: Automated Emergency Action Forgery
* **Attacker Goal:** Force an automated SOS call to a contact without user presence.
* **Attack Path:** Malicious script calls `/api/v1/suggestions/execute-action` with forged payload.
* **Defense-in-Depth Defenses:**
  1. `POST /authorize-action` requires valid session + explicit user consent check.
  2. Action Token has a strict **60-second Time-to-Live (TTL)**.
  3. `POST /execute-action` requires `confirmed_by_user: true` and active JWT token.
  4. System phone dialer requires native OS user tap (`tel:` protocol invocation).

---

## 4. Third-Party Integration Security (OAuth 2.0 PKCE)

* **Spotify Integration:** Authorization Code Flow with **Proof Key for Code Exchange (PKCE)** using SHA-256 challenges (`code_challenge_method: S256`). Client secret is never embedded in client JS bundles.
* **Token Storage:** Tokens are held in ephemeral session storage and never written to permanent browser local storage.
