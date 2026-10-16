'use client';
import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import AdminLayout from '@/components/layout/AdminLayout';
import { fetchWithAuth } from '@/lib/api-client';

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
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState<Record<string, any>>({});

  useEffect(() => {
    // Fetch users for resolving actor names
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const map: Record<string, any> = {};
        snapshot.forEach(doc => {
          map[doc.id] = doc.data();
        });
        setUserMap(map);
      },
      () => {}
    );

    const unsubLogs = onSnapshot(
      query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(200)),
      (snapshot) => {
        setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      async () => {
        try {
          const res = await fetchWithAuth('/api/audit');
          if (res.ok) {
            const data = await res.json();
            if (data.logs) setLogs(data.logs);
          }
        } catch {}
        setLoading(false);
      }
    );
    return () => {
      unsubLogs();
      unsubUsers();
    };
  }, []);

  return (
    <AdminLayout>
      <div className="page-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title flex items-center gap-2">
                    Audit Logs
                  </h1>
                  <p className="page-subtitle">Track all cross-platform activities in real time.</p>
                </div>
              </div>
            <div className="card-elevated" style={{ padding: 24 }}>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Details</th>
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
                        <tr key={log.id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{formatDate(log.timestamp)}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{log.module || log.actorRole || 'System'}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500 }}>
                              {log.actorName || (userMap[log.actorId]?.firstName && userMap[log.actorId]?.lastName ? `${userMap[log.actorId]?.firstName} ${userMap[log.actorId]?.lastName}` : (userMap[log.actorId]?.name || userMap[log.actorId]?.email || log.actorEmail || 'Unknown'))}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{log.actorId}</div>
                          </td>
                          <td>
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
                          <td>
                            <div style={{ fontWeight: 500 }}>{log.entityType || '-'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 4 }}>{log.entityId || '-'}</div>
                          </td>
                          <td>
                            <div style={{ maxWidth: 300, whiteSpace: 'normal', fontSize: 13, color: 'var(--text-secondary)' }}>
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
          </div>
    </AdminLayout>
  );
}
