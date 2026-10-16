'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { useSidebar } from '@/lib/hooks/useSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  requiredPermission?: React.ComponentProps<typeof ProtectedRoute>['requiredPermission'];
}

export default function AdminLayout({ children, requiredPermission }: AdminLayoutProps) {
  const { sidebarOpen, setSidebarOpen, toggleSidebar, isMobile } = useSidebar();

  return (
    <ProtectedRoute requiredPermission={requiredPermission}>
      <div
        style={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          background: 'var(--bg-primary)',
          position: 'relative',
        }}
      >
        {/* Mobile backdrop — closes sidebar when tapped */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              zIndex: 40,
            }}
          />
        )}

        {/* Sidebar container — overlay on mobile, inline smoothly on desktop */}
        <div
          style={{
            position: isMobile ? 'fixed' : 'relative',
            top: 0,
            left: 0,
            height: '100%',
            zIndex: isMobile ? 50 : 'auto',
            transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
            transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
            flexShrink: 0,
          }}
        >
          <Sidebar open={isMobile ? true : sidebarOpen} onToggle={toggleSidebar} />
        </div>

        {/* Main layout content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <Topbar onMenuToggle={toggleSidebar} />
          <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
