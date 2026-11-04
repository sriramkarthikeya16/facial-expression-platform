/**
 * MoodLens - WebSocket Real-Time Hook
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

interface UseWebSocketOptions {
  sessionId: string | null;
  onExpressionUpdate?: (data: any) => void;
  onSuggestion?: (data: any) => void;
}

export function useWebSocket({ sessionId, onExpressionUpdate, onSuggestion }: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const token = useAuthStore((s) => s.token);
  const pingIntervalRef = useRef<number | null>(null);

  // Keep callback refs stable across re-renders to prevent disconnect loops
  const onExpressionUpdateRef = useRef(onExpressionUpdate);
  const onSuggestionRef = useRef(onSuggestion);

  useEffect(() => {
    onExpressionUpdateRef.current = onExpressionUpdate;
  }, [onExpressionUpdate]);

  useEffect(() => {
    onSuggestionRef.current = onSuggestion;
  }, [onSuggestion]);

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    if (!sessionId || !token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const wsUrl = `${WS_BASE_URL}/api/v1/ws/${sessionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Step 1: Send authentication message
      ws.send(JSON.stringify({ type: 'auth', token }));

      // Setup 30s ping heartbeat
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ready') {
          setIsConnected(true);
          setError(null);
        } else if (data.type === 'expression_update') {
          onExpressionUpdateRef.current?.(data);
        } else if (data.type === 'suggestion') {
          onSuggestionRef.current?.(data);
        } else if (data.type === 'error') {
          setError(data.message || 'WebSocket error');
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket connection error:', err);
      setError('Real-time connection failed');
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [sessionId, token]);

  return { isConnected, error, sendMessage };
}
