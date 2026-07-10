import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import MobileBottomNav from '../components/layout/MobileBottomNav';
import { SkipToContent, PwaInstallPrompt, PageTransition, ErrorBoundary } from '../components/ui';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 pb-16 lg:pb-0">
      <SkipToContent />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:mr-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8" tabIndex={-1}>
          <ErrorBoundary key={location.pathname}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </ErrorBoundary>
        </main>
      </div>
      <MobileBottomNav onMenuClick={() => setSidebarOpen(true)} />
      <PwaInstallPrompt />
    </div>
  );
}
