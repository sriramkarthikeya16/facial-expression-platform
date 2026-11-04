/**
 * MoodLens - Auth API Service
 */
import { apiClient } from './api';
import { AuthResponse, User, UserPreferences, ConsentRecord } from '../types/api';

export const authApi = {
  register: async (data: { username: string; email: string; password: string }): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', data);
    return res.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/users/me');
    return res.data;
  },

  updateMe: async (data: { username?: string; email?: string }): Promise<User> => {
    const res = await apiClient.patch<User>('/users/me', data);
    return res.data;
  },

  getPreferences: async (): Promise<UserPreferences> => {
    const res = await apiClient.get<UserPreferences>('/users/me/preferences');
    return res.data;
  },

  updatePreferences: async (data: Partial<UserPreferences>): Promise<UserPreferences> => {
    const res = await apiClient.patch<UserPreferences>('/users/me/preferences', data);
    return res.data;
  },

  getConsents: async (): Promise<{ consents: ConsentRecord[] }> => {
    const res = await apiClient.get<{ consents: ConsentRecord[] }>('/consents');
    return res.data;
  },

  upsertConsent: async (data: { consent_type: string; granted: boolean }): Promise<ConsentRecord> => {
    const res = await apiClient.post<ConsentRecord>('/consents', data);
    return res.data;
  },
};
