"""
MoodLens Backend - WebSocket Message Handler
"""
from __future__ import annotations
from typing import Optional
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError

from app.core.security import decode_access_token
from app.websocket.manager import manager

VALID_EXPRESSIONS = (
    "happy", "sad", "angry", "fear", "disgust", "surprise",
    "neutral", "occluded", "no_face",
)


async def handle_websocket(
    websocket: WebSocket,
    session_id: str,
    db: AsyncSession,
) -> None:
    """Handle the complete WebSocket connection lifecycle."""
    await websocket.accept()
    user_id: Optional[str] = None

    try:
        # Step 1: Wait for auth message
        try:
            auth_data = await websocket.receive_json()
        except WebSocketDisconnect:
            # Client closed the connection before sending auth
            return
        except Exception:
            try:
                await websocket.close(code=1008, reason="Expected auth message")
            except Exception:
                pass
            return

        if not isinstance(auth_data, dict) or auth_data.get("type") != "auth":
            try:
                await websocket.close(code=1008, reason="First message must be auth")
            except Exception:
                pass
            return

        token = auth_data.get("token", "")

        # Step 2: Validate token
        try:
            payload = decode_access_token(token)
            user_id = payload.get("sub")
            if not user_id:
                raise JWTError("Missing subject")
        except JWTError:
            try:
                await websocket.send_json({
                    "type": "error",
                    "code": "auth_failed",
                    "message": "Invalid or expired access token",
                })
                await websocket.close(code=1008, reason="Auth failed")
            except Exception:
                pass
            return

        # Step 3: Register and confirm ready
        await manager.connect(websocket, session_id, user_id)
        await websocket.send_json({
            "type": "ready",
            "session_id": session_id,
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        })

        # Step 4: Message loop
        while True:
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                break
            except Exception:
                break

            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "expression_update":
                expression = data.get("expression") or data.get("dominant_expression", "neutral")
                confidence = float(data.get("confidence", 0.0))

                if expression not in VALID_EXPRESSIONS:
                    await websocket.send_json({
                        "type": "error",
                        "code": "invalid_expression",
                        "message": f"Unknown expression: {expression}",
                    })
                    continue

                relay_msg = {
                    "type": "expression_update",
                    "session_id": session_id,
                    "face_id": data.get("face_id", "primary"),
                    "tracking_confidence": data.get("tracking_confidence", 1.0),
                    "quality": data.get("quality", {
                        "brightness": 0.85,
                        "sharpness": 0.80,
                        "face_size_ratio": 0.30,
                    }),
                    "raw_probabilities": data.get("raw_probabilities", {}),
                    "smoothed_probabilities": data.get("smoothed_probabilities", {}),
                    "dominant_expression": expression,
                    "confidence": confidence,
                    "state": data.get("state", "VISIBLE"),
                    "inference_latency_ms": data.get("inference_latency_ms", 0.0),
                    "timestamp": data.get(
                        "timestamp",
                        datetime.now(tz=timezone.utc).isoformat(),
                    ),
                }
                await manager.send_to_session(
                    session_id, relay_msg, exclude_user_id=user_id
                )

            elif msg_type == "session_end":
                break

    except WebSocketDisconnect:
        pass
    finally:
        if user_id:
            await manager.disconnect(session_id, user_id)
