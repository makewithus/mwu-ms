'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Role, hasPermission } from '@/lib/auth/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: 'canManageEmployees' | 'canManageClients' | 'canManageProjects' | 'canViewAllProjects' | 'canManageInvoices' | 'canManageIntegrations' | 'canManageSystemUsers';
}

export default function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // If Firebase Auth is logged out but we are in a protected route,
        // the Next.js session cookie might be stale. Clear it to break redirect loops.
        fetch('/api/auth/session', { method: 'DELETE' }).finally(() => {
          window.location.assign('/login');
        });
      } else if (requiredPermission && userData) {
        const hasAccess = hasPermission(userData.role as Role, requiredPermission);
        if (!hasAccess) {
          router.push('/unauthorized');
        }
      }
    }
  }, [user, userData, loading, router, requiredPermission]);

  if (loading || !user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '2.5px solid var(--accent-blue)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.75s linear infinite',
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
            Loading...
          </span>
        </div>
      </div>
    );
  }

  if (requiredPermission && userData && !hasPermission(userData.role as Role, requiredPermission)) {
    return null;
  }

  return <>{children}</>;
}
