/**
 * MoodLens Shared Schemas - User & GDPR / CCPA Contracts
 */
import { ConsentRecord } from './consent';

export type UserRole = 
  | 'USER' | 'DEVELOPER' | 'ADMIN' | 'SUPPORT' | 'SECURITY_AUDITOR'
  | 'user' | 'developer' | 'admin' | 'support' | 'security_auditor';

export interface TrustedContact {
  id: string;
  name: string;
  phone_number?: string;
  relationship?: string;
  is_favorite: boolean;
}

export interface UserPreferences {
  user_id: string;
  suggestion_frequency: 'low' | 'balanced' | 'high';
  cooldown_seconds: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  favorite_music_genres: string[];
  preferred_food_apps: string[];
  theme: 'light' | 'dark' | 'system';
}

export interface UserExportDataPackage {
  exported_at: string;
  user_id_hash: string;
  profile: {
    email: string;
    full_name: string;
    created_at: string;
    role: UserRole;
  };
  preferences: UserPreferences | null;
  consents: ConsentRecord[];
  sessions_summary: {
    total_sessions: number;
    total_duration_minutes: number;
  };
  trusted_contacts: TrustedContact[];
}
