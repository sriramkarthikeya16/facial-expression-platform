/**
 * MoodLens Shared Configuration - Emotion Taxonomy & Labels
 */
import { Emotion, SystemState } from '../schemas/expression';

export const CORE_EMOTIONS: readonly Emotion[] = [
  'happy',
  'sad',
  'angry',
  'fear',
  'disgust',
  'surprise',
  'neutral',
] as const;

export const SYSTEM_STATES: readonly SystemState[] = [
  'occluded',
  'no_face',
  'multi_face_warning',
] as const;

export const EMOTION_DISPLAY_NAMES: Record<Emotion | SystemState, string> = {
  happy: 'Happy',
  sad: 'Sad',
  angry: 'Angry',
  fear: 'Fear',
  disgust: 'Disgust',
  surprise: 'Surprise',
  neutral: 'Neutral',
  occluded: 'Face Partially Occluded',
  no_face: 'No Face Detected',
  multi_face_warning: 'Multiple Faces Detected',
};

export const EMOTION_COLORS: Record<Emotion | SystemState, string> = {
  happy: '#10B981', // Emerald
  sad: '#3B82F6', // Blue
  angry: '#EF4444', // Red
  fear: '#8B5CF6', // Purple
  disgust: '#F59E0B', // Amber
  surprise: '#EC4899', // Pink
  neutral: '#6B7280', // Gray
  occluded: '#D97706',
  no_face: '#4B5563',
  multi_face_warning: '#F59E0B',
};
