'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth, parseApiResponse } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { Activity, CheckCircle2, Clock3, DatabaseZap } from 'lucide-react';

// Mock data removed. Will fetch real data inside the component.

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth('/api/dashboard/stats')
      .then(parseApiResponse)
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error('Failed to load stats', e);
        setLoading(false);
      });
  }, []);

  const stats = [
    { id: 'clients', label: 'Total Clients', value: data?.stats?.clients ?? '-', icon: Activity, badge: 'CMS' },
    { id: 'employees', label: 'Total Employees', value: data?.stats?.employees ?? '-', icon: CheckCircle2, badge: 'EMS' },
    { id: 'projects', label: 'Total Projects', value: data?.stats?.projects ?? '-', icon: Clock3, badge: 'LIVE' },
    { id: 'integrations', label: 'Pending Integrations', value: data?.stats?.integrations ?? '-', icon: DatabaseZap, badge: 'SYNC' },
  ];

  const activity = data?.activity || [];

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handle = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches);
      setSidebarOpen(!event.matches);
    };

    handle(mq);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  return (
    <ProtectedRoute>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)', position: 'relative' }}>
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
          <Sidebar open={isMobile ? true : sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <div className="page-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">Central Admin</h1>
                  <p className="page-subtitle">Unified command center for MakeWithUs operations</p>
                </div>
                <div className="badge badge-red">SUPER ADMIN</div>
              </div>

              <section className="stats-grid" style={{ marginBottom: 20 }}>
                {stats.map(({ id, label, value, icon: Icon, badge }) => (
                  <div key={label} id={id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div className="badge badge-gray">{badge}</div>
                      <Icon size={18} color="var(--brand-red)" strokeWidth={1.8} />
                    </div>
                    <div className="stat-divider" />
                    <div style={{ fontSize: 30, lineHeight: 1, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
                      {value}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                      {label}
                    </div>
                  </div>
                ))}
              </section>

              <section className="charts-grid">
                <div className="card-elevated" style={{ gridColumn: 'span 8', padding: 24, minHeight: 320 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                      <h2 style={{ fontSize: 16, textTransform: 'uppercase', letterSpacing: '-0.03em' }}>Ecosystem Overview</h2>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>CMS, EMS, projects, invoices, and integration health</p>
                    </div>
                    <span className="badge badge-green">ONLINE</span>
                  </div>

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Module</th>
                          <th>Status</th>
                          <th>Queue</th>
                          <th>Last Sync</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Client Management</td>
                          <td><span className="badge badge-green">Synced</span></td>
                          <td>Real-time</td>
                          <td>Live</td>
                        </tr>
                        <tr>
                          <td>Employee Management</td>
                          <td><span className="badge badge-green">Synced</span></td>
                          <td>Real-time</td>
                          <td>Live</td>
                        </tr>
                        <tr>
                          <td>Project Access</td>
                          <td><span className="badge badge-green">Synced</span></td>
                          <td>Real-time</td>
                          <td>Live</td>
                        </tr>
                        <tr>
                          <td>Invoice Payments</td>
                          <td><span className="badge badge-green">Synced</span></td>
                          <td>Real-time</td>
                          <td>Live</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card" style={{ gridColumn: 'span 4', padding: 24, minHeight: 320 }}>
                  <h2 style={{ fontSize: 16, textTransform: 'uppercase', letterSpacing: '-0.03em', marginBottom: 4 }}>Activity</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>Central integration status</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {loading ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>Loading activity...</div>
                    ) : activity.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>No recent activity.</div>
                    ) : activity.map((item: any) => (
                      <div key={item.id || item.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                        <span className="status-dot" style={{ background: item.color }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
