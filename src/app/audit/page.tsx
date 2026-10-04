'use client';
import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

const formatDate = (dateObj: any) => {
  if (!dateObj) return 'N/A';
  if (typeof dateObj === 'string') {
    const d = new Date(dateObj);
    return isNaN(d.getTime()) ? dateObj : d.toLocaleString();
  }
  if (dateObj._seconds) return new Date(dateObj._seconds * 1000).toLocaleString();
  if (dateObj.seconds) return new Date(dateObj.seconds * 1000).toLocaleString();
  return new Date(dateObj).toLocaleString();
};

export default function AuditLogsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handle = (e: any) => { setIsMobile(e.matches); setSidebarOpen(!e.matches); };
    handle(mq); mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(200)),
      (snapshot) => {
        setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching audit logs:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-bg">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} title="Audit Logs" />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="card-elevated" style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-dark)' }}>
                      <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Timestamp</th>
                      <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Actor</th>
                      <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Action</th>
                      <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Entity</th>
                      <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                          Loading audit logs...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                          No audit logs found.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 500 }}>{formatDate(log.timestamp)}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.module || log.actorRole || 'System'}</div>
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ fontWeight: 500 }}>{log.actorName || log.actorEmail || 'Unknown'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.actorId}</div>
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ 
                              display: 'inline-block', 
                              padding: '4px 10px', 
                              borderRadius: 4, 
                              fontSize: 12, 
                              fontWeight: 600,
                              background: 'var(--bg-dark)',
                              border: '1px solid var(--border)'
                            }}>
                              {String(log.action).replace(/_/g, ' ')}
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ fontWeight: 500 }}>{log.entityType || '-'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.entityId || '-'}</div>
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ maxWidth: 300, whiteSpace: 'normal', fontSize: 13 }}>
                              {log.description || '-'}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
