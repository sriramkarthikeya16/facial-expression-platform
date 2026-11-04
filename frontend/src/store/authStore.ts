/**
 * MoodLens - Auth Zustand Store
 */
import { create } from 'zustand';
import { User, UserPreferences } from '../types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  preferences: UserPreferences | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  theme: 'light' | 'dark';
  setAuth: (user: User, token: string) => void;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  setPreferences: (prefs: UserPreferences) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

const getInitialTheme = (): 'light' | 'dark' => {
  const saved = localStorage.getItem('moodlens_theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  preferences: null,
  isAuthenticated: false,
  isLoading: true,
  theme: getInitialTheme(),

  setAuth: (user, token) => {
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  setToken: (token) => {
    set({ token, isAuthenticated: true });
  },

  setUser: (user) => {
    set({ user });
  },

  setPreferences: (preferences) => {
    set({ preferences });
  },

  setTheme: (theme) => {
    localStorage.setItem('moodlens_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },

  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('moodlens_theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: newTheme };
    });
  },

  logout: () => {
    set({ user: null, token: null, preferences: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },
}));
