'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth/auth-context';
import { db } from '@/lib/firebase/client';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import {
  Bell,
  CheckCheck,
  CalendarDays,
  DollarSign,
  ClipboardList,
  FolderOpen,
  Clock,
  Megaphone,
  Loader2,
  Trash2,
  Plus,
  Send,
  X,
  Check,
} from 'lucide-react';

type Notif = {
  id: string;
  type: string;
  title: string;
  message: string;
  userId?: string;
  isRead: boolean;
  link?: string;
  createdAt?: any;
};

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  task: { icon: ClipboardList, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  leave: { icon: CalendarDays, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  payslip: { icon: DollarSign, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
  document: { icon: FolderOpen, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
  attendance: { icon: Clock, color: 'var(--brand-red)', bg: 'rgba(255, 49, 49, 0.15)' },
  notice: { icon: Megaphone, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  general: { icon: Bell, color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.06)' },
};

export default function NotificationsPage() {
  const { user, userData } = useAuth();

  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Broadcast Modal
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [broadcast, setBroadcast] = useState({
    targetUserId: 'ALL',
    title: '',
    message: '',
    type: 'general',
  });

  // Real-time Firestore Notifications Listener
  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Notif[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type || 'general',
            title: data.title || 'System Notification',
            message: data.message || '',
            userId: data.userId,
            isRead: !!data.isRead,
            link: data.link,
            createdAt: data.createdAt,
          };
        });
        setNotifs(rows);
        setLoading(false);
      },
      async () => {
        try {
          const res = await fetch('/api/notifications');
          const data = await res.json();
          if (data.notifications) {
            setNotifs(data.notifications);
          }
        } catch {
          // Silent fallback
        } finally {
          setLoading(false);
        }
      }
    );
    return () => unsub();
  }, []);

  // Real-time Employees for notification recipient selector
  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const emps = snap.docs
          .map((d) => {
            const data = d.data();
            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || d.id;
            return {
              id: data.uid || d.id,
              name: fullName,
            };
          })
          .filter((e) => e.name);
        setEmployees(emps);
      },
      () => {}
    );
    return () => unsub();
  }, []);

  // Mark single as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch {
      toast.error('Failed to update notification');
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const unread = notifs.filter((n) => !n.isRead);
      const promises = unread.map((n) => updateDoc(doc(db, 'notifications', n.id), { isRead: true }));
      await Promise.all(promises);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  // Delete notification
  const handleDeleteNotif = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success('Notification removed');
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  // Send Notification / Broadcast
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcast.title.trim() || !broadcast.message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setSending(true);
    try {
      if (broadcast.targetUserId === 'ALL') {
        // Broadcast to all employees
        const promises = employees.map((emp) =>
          addDoc(collection(db, 'notifications'), {
            userId: emp.id,
            companyId: 'default',
            title: broadcast.title.trim(),
            message: broadcast.message.trim(),
            type: broadcast.type,
            isRead: false,
            link: '/dashboard',
            createdAt: serverTimestamp(),
          })
        );
        await Promise.all(promises);
        toast.success(`Broadcast sent to ${employees.length} employees!`);
      } else {
        await addDoc(collection(db, 'notifications'), {
          userId: broadcast.targetUserId,
          companyId: 'default',
          title: broadcast.title.trim(),
          message: broadcast.message.trim(),
          type: broadcast.type,
          isRead: false,
          link: '/dashboard',
          createdAt: serverTimestamp(),
        });
        toast.success('Notification sent successfully!');
      }

      setShowModal(false);
      setBroadcast({
        targetUserId: 'ALL',
        title: '',
        message: '',
        type: 'general',
      });
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const filtered = useMemo(() => {
    return notifs.filter((n) => {
      if (filter === 'unread') return !n.isRead;
      return true;
    });
  }, [notifs, filter]);

  const unreadCount = notifs.filter((n) => !n.isRead).length;

  return (
    <AdminLayout>
      <div className="page-container" style={{ paddingBottom: 60 }}>
              {/* Header */}
              <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                  <h1 className="page-title">Notifications & Broadcasts</h1>
                  <p className="page-subtitle">Real-time alerts, system triggers, and direct staff broadcasts</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="btn btn-secondary" style={{ gap: 6, padding: '7px 14px', fontSize: 12 }}>
                      <CheckCheck size={14} /> Mark All Read
                    </button>
                  )}
                  <button
                    onClick={() => setShowModal(true)}
                    className="btn btn-primary"
                    style={{ gap: 8, padding: '8px 16px', fontSize: 13 }}
                  >
                    <Send size={14} /> Dispatch Alert
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                <button
                  onClick={() => setFilter('all')}
                  className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '6px 14px', fontSize: 12 }}
                >
                  All Alerts ({notifs.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '6px 14px', fontSize: 12 }}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Notification List */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading real-time notifications...</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Bell size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No notifications found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>You have cleared all pending alerts.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filtered.map((n) => {
                      const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
                      const Icon = cfg.icon;

                      return (
                        <div
                          key={n.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border)',
                            background: n.isRead ? 'transparent' : 'rgba(255, 49, 49, 0.03)',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                background: cfg.bg,
                                color: cfg.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Icon size={17} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: 'var(--text-primary)' }}>
                                  {n.title}
                                </span>
                                {!n.isRead && (
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-red)' }} />
                                )}
                              </div>
                              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {!n.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(n.id)}
                                className="btn btn-ghost"
                                style={{ padding: '4px 8px', fontSize: 11 }}
                                title="Mark as Read"
                              >
                                <Check size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteNotif(n.id)}
                              className="btn btn-ghost"
                              style={{ padding: '4px 8px', color: 'var(--brand-red)' }}
                              title="Delete Alert"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

        {/* BROADCAST ALERT MODAL */}
        {showModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 16,
            }}
            onClick={() => setShowModal(false)}
          >
            <div
              className="card"
              style={{
                width: 480,
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: 28,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-strong)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Dispatch Staff Alert</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Send an instant in-app notification to one or all employees
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ padding: 6 }}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Recipient Target <span style={{ color: 'var(--brand-red)' }}>*</span>
                  </label>
                  <select
                    className="input-base"
                    value={broadcast.targetUserId}
                    onChange={(e) => setBroadcast((p) => ({ ...p, targetUserId: e.target.value }))}
                  >
                    <option value="ALL">All Employees (Company Broadcast)</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Alert Title <span style={{ color: 'var(--brand-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="input-base"
                    placeholder="e.g. Urgent Payroll Verification Required"
                    value={broadcast.title}
                    onChange={(e) => setBroadcast((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Category Type
                  </label>
                  <select
                    className="input-base"
                    value={broadcast.type}
                    onChange={(e) => setBroadcast((p) => ({ ...p, type: e.target.value }))}
                  >
                    <option value="general">General Alert</option>
                    <option value="task">Task Notification</option>
                    <option value="leave">Leave Notification</option>
                    <option value="payslip">Payroll Notification</option>
                    <option value="attendance">Attendance Alert</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Message Body <span style={{ color: 'var(--brand-red)' }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    className="input-base"
                    placeholder="Enter detailed notification content..."
                    value={broadcast.message}
                    onChange={(e) => setBroadcast((p) => ({ ...p, message: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={sending}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={sending} style={{ gap: 6 }}>
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {sending ? 'Sending…' : 'Dispatch Notification'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </AdminLayout>
  );
}
