/**
 * MoodLens - Admin Telemetry & Observability API Client
 */
import { api } from './api';
import { AdminTelemetryDTO, ModelDTO, ModelRegistryListDTO } from '../types/api';

export const adminApi = {
  /**
   * Fetches real aggregate telemetry, latency metrics, and emotion distributions.
   */
  getTelemetry: async (): Promise<AdminTelemetryDTO> => {
    const response = await api.get<AdminTelemetryDTO>('/admin/telemetry');
    return response.data;
  },

  /**
   * Lists all models in the ModelRegistry.
   */
  getModels: async (quantization?: string): Promise<ModelRegistryListDTO> => {
    const params = quantization ? { quantization } : {};
    const response = await api.get<ModelRegistryListDTO>('/models', { params });
    return response.data;
  },

  /**
   * Fetches metadata for the currently active production edge model.
   */
  getActiveModel: async (): Promise<ModelDTO> => {
    const response = await api.get<ModelDTO>('/models/active');
    return response.data;
  },

  /**
   * Activates a specific model release in the registry.
   */
  activateModel: async (modelId: string): Promise<ModelDTO> => {
    const response = await api.post<ModelDTO>(`/models/${modelId}/activate`);
    return response.data;
  },

  /**
   * Rolls back to a previous model release.
   */
  rollbackModel: async (modelId: string): Promise<ModelDTO> => {
    const response = await api.post<ModelDTO>(`/models/${modelId}/rollback`);
    return response.data;
  },
};
