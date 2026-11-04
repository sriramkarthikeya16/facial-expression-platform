/**
 * MoodLens - Session API Service
 */
import { apiClient } from './api';
import { DetectionSessionDTO, ExpressionEventDTO, PaginatedSessions } from '../types/api';

export const sessionApi = {
  createSession: async (data: { platform?: string; model_version?: string }): Promise<DetectionSessionDTO> => {
    const res = await apiClient.post<DetectionSessionDTO>('/sessions', {
      platform: data.platform || 'web',
      model_version: data.model_version || '1.2.0',
    });
    return res.data;
  },

  endSession: async (sessionId: string, totalDurationSeconds?: number): Promise<DetectionSessionDTO> => {
    const res = await apiClient.patch<DetectionSessionDTO>(`/sessions/${sessionId}/end`, {
      total_duration_seconds: totalDurationSeconds,
    });
    return res.data;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/sessions/${sessionId}`);
  },

  listSessions: async (page = 1, limit = 20, status?: string): Promise<PaginatedSessions> => {
    const params: Record<string, any> = { page, limit };
    if (status) params.status = status;
    const res = await apiClient.get<PaginatedSessions>('/sessions', { params });
    return res.data;
  },

  getSessionEvents: async (sessionId: string): Promise<ExpressionEventDTO[]> => {
    const res = await apiClient.get<ExpressionEventDTO[]>(`/sessions/${sessionId}/events`);
    return res.data;
  },

  batchRecordEvents: async (
    sessionId: string,
    events: Array<{
      expression: string;
      confidence: number;
      duration_seconds: number;
      quality_score?: number;
      recorded_at?: string;
    }>
  ): Promise<{ recorded: number }> => {
    const res = await apiClient.post<{ recorded: number }>(`/sessions/${sessionId}/events`, {
      events,
    });
    return res.data;
  },

  respondToSuggestion: async (suggestionId: string, decision: string): Promise<any> => {
    const res = await apiClient.post(`/suggestions/${suggestionId}/respond`, { decision });
    return res.data;
  },
};
