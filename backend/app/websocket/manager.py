"""
MoodLens Backend - WebSocket Connection Manager
Manages active WebSocket connections per session.
For multi-instance deployments, upgrade to Redis pub/sub.
"""
from typing import Dict, Optional

from fastapi import WebSocket


class ConnectionManager:
    """
    In-memory WebSocket connection manager.
    Maps session_id → {user_id → WebSocket}.
    """

    def __init__(self):
        self._connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str, user_id: str) -> None:
        """Register a pre-accepted WebSocket connection."""
        if session_id not in self._connections:
            self._connections[session_id] = {}
        self._connections[session_id][user_id] = websocket

    async def disconnect(self, session_id: str, user_id: str) -> None:
        """Remove a WebSocket connection."""
        if session_id in self._connections:
            self._connections[session_id].pop(user_id, None)
            if not self._connections[session_id]:
                del self._connections[session_id]

    async def send_to_user(self, session_id: str, user_id: str, message: dict) -> None:
        """Send a JSON message to a specific user."""
        ws = self._connections.get(session_id, {}).get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                await self.disconnect(session_id, user_id)

    async def send_to_session(
        self,
        session_id: str,
        message: dict,
        exclude_user_id: Optional[str] = None,
    ) -> None:
        """Broadcast a JSON message to all users in a session."""
        if session_id not in self._connections:
            return
        disconnected = []
        for uid, ws in self._connections[session_id].items():
            if uid == exclude_user_id:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(uid)
        for uid in disconnected:
            self._connections[session_id].pop(uid, None)

    def is_connected(self, session_id: str, user_id: str) -> bool:
        """Check if a user has an active connection for a session."""
        return user_id in self._connections.get(session_id, {})


# Global singleton
manager = ConnectionManager()
