'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { AlertCircle, Building2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('invalid-credential') || message.includes('wrong-password') || message.includes('user-not-found')) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-layout" style={{ height: '100dvh', width: '100%', overflow: 'hidden' }}>
      <section
        className="hidden md:flex w-full md:w-[55%]"
        style={{
          background: 'var(--bg-dark)',
          position: 'relative',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            paddingLeft: 'clamp(24px, 4vw, 48px)',
            paddingRight: 'clamp(24px, 4vw, 48px)',
            paddingTop: 'clamp(24px, 4vw, 48px)',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-inverse)', letterSpacing: '-0.08em', textTransform: 'uppercase' }}>
            makewithus
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            paddingLeft: 'clamp(24px, 4vw, 48px)',
            paddingRight: 'clamp(24px, 4vw, 48px)',
            paddingTop: 'clamp(20px, 3vw, 40px)',
            paddingBottom: 'clamp(20px, 3vw, 40px)',
          }}
        >
          <h1
            style={{
              fontFamily: "'Helvetica', Arial, sans-serif",
              fontSize: 'clamp(48px, 6vw, 84px)',
              lineHeight: 0.95,
              fontWeight: 800,
              color: 'var(--text-inverse)',
              letterSpacing: '-0.04em',
              textTransform: 'uppercase',
            }}
          >
            Central<br />
            Admin<br />
            <span style={{ color: 'var(--brand-red)' }}>System</span>
          </h1>

          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 'clamp(14px, 1.2vw, 16px)',
              lineHeight: 1.5,
              fontWeight: 400,
              marginTop: 40,
              maxWidth: 430,
              letterSpacing: '-0.01em',
            }}
          >
            Manage clients, employees, projects, invoices, and integration flows across the MakeWithUs ecosystem from one secure control plane.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, marginTop: 48, border: '1px solid var(--border-strong)', width: 'fit-content' }}>
            {[
              { label: 'Operations', value: '360°' },
              { label: 'Access', value: '24/7' },
              { label: 'Security', value: '99.9%' },
            ].map((stat, index) => (
              <div
                key={stat.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '16px 24px',
                  background: 'transparent',
                  borderRight: index !== 2 ? '1px solid var(--border-strong)' : 'none',
                  minWidth: 100,
                }}
              >
                <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-inverse)', lineHeight: 1, letterSpacing: '-0.04em' }}>
                  {stat.value}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 10,
            borderTop: '1px solid var(--border-strong)',
            paddingTop: 24,
            paddingBottom: 'clamp(24px, 3vw, 40px)',
            paddingLeft: 'clamp(24px, 4vw, 48px)',
            paddingRight: 'clamp(24px, 4vw, 48px)',
          }}
        >
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 500 }}>
            CENTRALIZED · SECURE · OPERATIONAL
          </p>
        </div>
      </section>

      <section
        className="w-full md:w-[45%]"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'var(--bg-primary)',
          padding: 'clamp(16px, 4vw, 48px)',
          position: 'relative',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', bottom: -50, right: -50, opacity: 0.03, pointerEvents: 'none' }}>
          <Building2 size={400} />
        </div>

        <div style={{ width: '100%', maxWidth: 400, margin: 'auto', position: 'relative', zIndex: 10 }}>
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck size={18} style={{ color: 'var(--text-primary)' }} strokeWidth={1.5} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              CENTRAL ADMIN PORTAL
            </span>
          </div>

          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.04em',
              marginBottom: 6,
              lineHeight: 1.1,
              textTransform: 'uppercase',
            }}
          >
            Sign In
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.5 }}>
            Enter your admin credentials to manage the ecosystem.
          </p>

          {error && (
            <div
              className="flex items-start gap-3"
              style={{
                background: 'transparent',
                border: '1px solid var(--brand-red)',
                padding: '12px 14px',
                marginBottom: 22,
              }}
            >
              <AlertCircle size={15} style={{ color: 'var(--brand-red)', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: 'var(--brand-red)', lineHeight: 1.45 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="block" style={{ fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'transparent',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 0,
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    fontFamily: 'inherit',
                  }}
                  placeholder="admin@mwums.com"
                  required
                  disabled={loading}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                />
              </div>

              <div>
                <label className="block" style={{ fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 14px',
                      background: 'transparent',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 0,
                      fontSize: 14,
                      color: 'var(--text-primary)',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      fontFamily: 'inherit',
                    }}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      padding: 0,
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: loading ? 'var(--text-muted)' : 'var(--bg-dark)',
                  color: 'var(--text-inverse)',
                  padding: '14px 16px',
                  borderRadius: 0,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                  fontFamily: 'inherit',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
                onMouseOver={(e) => {
                  if (!loading) e.currentTarget.style.background = 'var(--brand-red)';
                }}
                onMouseOut={(e) => {
                  if (!loading) e.currentTarget.style.background = 'var(--bg-dark)';
                }}
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? 'Signing in' : 'Sign in'}
              </button>
            </div>
          </form>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 48, lineHeight: 1.5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            MWU INTERNAL PLATFORM · Encrypted Session
          </p>
        </div>
      </section>
    </div>
  );
}
