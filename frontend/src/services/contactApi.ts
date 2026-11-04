/**
 * MoodLens - Trusted Contacts API Service (Spec Sections 32, 37, 66)
 */
import { apiClient } from './api';

export interface TrustedContactDTO {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  relationship?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateContactPayload {
  name: string;
  phone_number: string;
  relationship?: string;
  is_favorite?: boolean;
}

export interface UpdateContactPayload {
  name?: string;
  phone_number?: string;
  relationship?: string;
  is_favorite?: boolean;
}

export const contactApi = {
  listContacts: async (): Promise<TrustedContactDTO[]> => {
    const res = await apiClient.get<TrustedContactDTO[]>('/users/me/contacts');
    return res.data;
  },

  getFavoriteContact: async (): Promise<TrustedContactDTO | null> => {
    const res = await apiClient.get<TrustedContactDTO | null>('/users/me/contacts/favorite');
    return res.data;
  },

  createContact: async (payload: CreateContactPayload): Promise<TrustedContactDTO> => {
    const res = await apiClient.post<TrustedContactDTO>('/users/me/contacts', payload);
    return res.data;
  },

  updateContact: async (id: string, payload: UpdateContactPayload): Promise<TrustedContactDTO> => {
    const res = await apiClient.put<TrustedContactDTO>(`/users/me/contacts/${id}`, payload);
    return res.data;
  },

  deleteContact: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/me/contacts/${id}`);
  },
};
