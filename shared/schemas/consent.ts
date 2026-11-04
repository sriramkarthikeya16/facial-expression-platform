/**
 * MoodLens Shared Schemas - 7-Category Granular Consent Contracts
 */

export type ConsentCategory = 
  | 'camera'
  | 'expression_processing'
  | 'mood_suggestions'
  | 'music_integration'
  | 'food_suggestions'
  | 'trusted_contacts'
  | 'cloud_sync';

export interface ConsentRecord {
  consent_type: ConsentCategory;
  granted: boolean;
  version: string;
  updated_at?: string;
}

export interface ConsentUpdatePayload {
  consents: Array<{
    consent_type: ConsentCategory;
    granted: boolean;
    version?: string;
  }>;
}
