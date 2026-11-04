# MoodLens Privacy, GDPR & CCPA Compliance Specification

**Document Version:** 1.0  
**Classification:** Regulatory & Privacy Engineering Standard  
**Governing Laws:** EU General Data Protection Regulation (GDPR 2016/679), California Consumer Privacy Act (CCPA/CPRA)

---

## 1. Executive Summary & Privacy-by-Design Architecture

MoodLens operates on a strict **Edge-First, Zero-Biometric-Harvesting Architecture**. Facial expression detection executes 100% locally on the user's client hardware via WebAssembly (`onnxruntime-web`). 

```text
[ Camera Stream ]
       ↓
[ Client Browser Memory ]
       ↓ (112x112 Crop)
[ Local ONNX Inference (WASM) ]
       ↓
[ Temporal State Machine ]
       ↓
[ Local UI Presentation ]
```

### Non-Negotiable Privacy Guarantees
1. **Zero Video / Frame Retention:** No raw video, camera frames, or cropped face images are ever stored on or transmitted to cloud servers.
2. **Zero Biometric Identifier Storage:** No facial geometry vectors, facial embeddings, or biometric templates are extracted or retained.
3. **Anonymized Telemetry:** Session duration and aggregated counts only; user IDs are irreversibly hashed with SHA-256 in all audit logs.

---

## 2. GDPR Compliance Matrix

### 2.1 Article 9 — Special Category (Biometric Data) Analysis
Under GDPR Article 9(1), processing of biometric data for the purpose of uniquely identifying a natural person is prohibited unless an exception applies.
* **MoodLens Invariant:** The system **never** performs biometric identification or 1-to-many face recognition. It classifies generic facial configurations.
* **Lawful Basis:** Explicit, granular, freely given user consent (GDPR Art. 6(1)(a) & Art. 9(2)(a)).

### 2.2 7-Category Granular Consent (Spec Section 34)
The platform enforces independent, toggleable consents:
1. `camera` — Local device camera access.
2. `expression_processing` — Real-time classification engine.
3. `mood_suggestions` — Contextual wellness & breathing suggestions.
4. `music_integration` — Spotify playlist suggestions.
5. `food_suggestions` — Contextual meal delivery prompts.
6. `trusted_contacts` — Level 5 SOS safety integration.
7. `cloud_sync` — Synchronizing aggregated duration history.

*Consent state is verified in code before every feature activation or action token issuance.*

### 2.3 Article 17 — Right to Erasure ("Right to be Forgotten")
* **API Endpoint:** `DELETE /api/v1/users/me/data`
* **Implementation:** Permanently deletes all detection sessions, expression events, suggestion records, and associated metadata. Action is logged in the SHA-256 audit trail.

### 2.4 Article 20 — Right to Data Portability
* **API Endpoint:** `GET /api/v1/users/me/export`
* **Implementation:** Generates a structured, machine-readable JSON package of user profile, consents, preferences, and session statistics.

---

## 3. CCPA / CPRA Compliance Standards

1. **Notice at Collection:** Users receive clear upfront disclosure before camera access is requested.
2. **Sensitive Personal Information Limits:** The platform does not sell or share personal information with third parties.
3. **Opt-Out & Erasure:** Users can revoke consents or execute complete erasure via the self-serve Settings UI at any time.

---

## 4. Privacy Audit Logging Specification

Sensitive actions generate privacy-minimized audit entries:

```json
{
  "event_type": "CALL_REQUESTED",
  "user_id_hash": "2fbeaec1ad53457c44efba6cd19a93f33aecfada8ccfe48b41577939aee8b274",
  "action_id": "act_sos_123",
  "source": "user_confirmation",
  "result": "dialer_opened",
  "timestamp": "2026-09-15T18:30:00Z"
}
```

*Raw contact phone numbers, access tokens, and image data are strictly excluded by automated assertion tests.*
