'use client';
import { useEffect, useState } from 'react';

export const toast = {
  success: (message: string) => window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message } })),
  error: (message: string) => window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message } })),
  info: (message: string) => window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'info', message } })),
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    const handler = (e: any) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, ...e.detail }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    window.addEventListener('toast', handler);
    return () => window.removeEventListener('toast', handler);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: 'var(--bg-secondary)',
          borderLeft: `3px solid ${t.type === 'success' ? '#22c55e' : t.type === 'error' ? 'var(--brand-red)' : 'var(--text-muted)'}`,
          padding: '14px 18px',
          borderRadius: '4px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          color: 'var(--text-primary)',
          fontSize: '13px',
          fontWeight: 500,
          minWidth: '260px',
          maxWidth: '360px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          animation: 'toastIn 0.25s ease-out forwards',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: t.type === 'success' ? '#22c55e' : t.type === 'error' ? 'var(--brand-red)' : 'var(--text-muted)'
          }} />
          {t.message}
        </div>
      ))}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes toastIn { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}} />
    </div>
  );
}
