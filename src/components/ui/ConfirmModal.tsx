'use client';
import { useEffect, useState } from 'react';

let confirmResolve: ((value: boolean) => void) | null = null;

export const confirmAction = (options?: any) => {
  return new Promise<boolean>((resolve) => {
    confirmResolve = resolve;
    window.dispatchEvent(new CustomEvent('confirm'));
  });
};

export default function ConfirmModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('confirm', handler);
    return () => window.removeEventListener('confirm', handler);
  }, []);

  if (!open) return null;

  const handleClose = (res: boolean) => {
    setOpen(false);
    if (confirmResolve) confirmResolve(res);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(false); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        width: '100%',
        maxWidth: 360,
        margin: '0 16px',
        padding: '28px 28px 24px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
      }}>
        <p style={{
          color: 'var(--text-primary)',
          fontSize: 15,
          fontWeight: 600,
          margin: '0 0 24px 0',
          letterSpacing: '-0.01em',
        }}>
          Are you sure you want to delete?
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => handleClose(false)}
            style={{
              padding: '9px 20px',
              border: '1px solid var(--border)',
              borderRadius: 4,
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => handleClose(true)}
            style={{
              padding: '9px 20px',
              border: 'none',
              borderRadius: 4,
              background: 'var(--brand-red)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
