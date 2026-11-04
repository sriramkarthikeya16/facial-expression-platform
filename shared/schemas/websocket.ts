/**
 * MoodLens Shared Schemas - WebSocket Protocol
 */
import { RealtimePredictionPayload, ExpressionState } from './expression';
import { SuggestionItem, SuggestionResponsePayload } from './suggestion';

export type WebSocketMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'expression_update'
  | 'suggestion'
  | 'suggestion_response'
  | 'state_sync'
  | 'error';

export interface WSClientMessage {
  type: WebSocketMessageType;
  session_id?: string;
  payload?: any;
}

export interface WSServerMessage {
  type: WebSocketMessageType;
  timestamp: string;
  session_id?: string;
  data?: RealtimePredictionPayload | SuggestionItem | { state: ExpressionState } | { error: string };
}
