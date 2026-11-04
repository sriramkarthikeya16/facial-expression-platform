/**
 * MoodLens - Sidebar Navigation Component
 */
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, Settings, ShieldCheck, Cpu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const Sidebar: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const navItems = [
    { to: '/dashboard', label: 'Live Dashboard', icon: LayoutDashboard },
    { to: '/history', label: 'Session History', icon: History },
    { to: '/settings', label: 'Settings & Consent', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', label: 'Admin Panel', icon: ShieldCheck });
  }

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <nav className="space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Privacy guarantee badge */}
      <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
        <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-400 mb-1">
          <Cpu className="w-4 h-4" />
          <span className="text-xs font-bold">100% On-Device AI</span>
        </div>
        <p className="text-[11px] text-indigo-900/70 dark:text-indigo-300/70 leading-relaxed">
          Camera frames are processed in-browser. Zero raw video is transmitted to any cloud servers.
        </p>
      </div>
    </aside>
  );
};
