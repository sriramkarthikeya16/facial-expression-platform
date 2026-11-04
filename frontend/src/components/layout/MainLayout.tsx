/**
 * MoodLens - Main Protected Layout
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { LiveAnnouncer } from '../common/LiveAnnouncer';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-background-dark">
      <LiveAnnouncer />
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
