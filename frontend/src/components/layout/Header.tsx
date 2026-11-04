/**
 * MoodLens - Header Component
 */
import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useExpressionStore } from '../../store/expressionStore';
import { Sun, Moon, LogOut, User as UserIcon, Activity, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, theme, toggleTheme, logout } = useAuthStore();
  const { triggerUserSOS } = useExpressionStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <Activity className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
            MoodLens
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Edge-First Expression Intelligence
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Explicit User SOS / Emergency Support Trigger */}
        <button
          onClick={triggerUserSOS}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-xs font-bold transition-all shadow-sm hover:shadow"
          title="Explicit SOS / Emergency Support"
          aria-label="Explicit SOS Emergency Support"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span>SOS Support</span>
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle color theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {user && (
          <div className="flex items-center space-x-3 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                {user.username.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">
                {user.username}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
