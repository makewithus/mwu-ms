'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { toast } from '@/components/ui/Toast';
import { confirmAction } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/lib/auth/auth-context';
import { db } from '@/lib/firebase/client';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Bell,
  Info,
  Loader2,
  X,
  Users,
  Eye,
} from 'lucide-react';

const PRIORITY_BADGES: Record<string, { bg: string; color: string; icon: any }> = {
  Low: { bg: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-muted)', icon: Info },
  Normal: { bg: 'var(--accent-blue-dim)', color: 'var(--accent-blue)', icon: Bell },
  Urgent: { bg: 'var(--accent-amber-dim)', color: 'var(--accent-amber)', icon: AlertTriangle },
  Critical: { bg: 'var(--accent-red-dim)', color: 'var(--brand-red)', icon: AlertCircle },
};

type Notice = {
  id: string;
  title: string;
  desc: string;
  dept: string;
  priority: 'Low' | 'Normal' | 'Urgent' | 'Critical';
  expiry?: string;
  readBy?: string[];
  createdAt?: any;
};

export default function NoticesPage() {
  const { user, userData } = useAuth();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // New Notice Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    desc: '',
    dept: 'All',
    priority: 'Normal' as Notice['priority'],
    expiry: '',
  });


  // Real-time Firestore Notices Listener
  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Notice[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || '',
            desc: data.desc || data.description || '',
            dept: data.dept || data.department || 'All',
            priority: data.priority || 'Normal',
            expiry: data.expiry || '',
            readBy: data.readBy || [],
            createdAt: data.createdAt,
          };
        });
        setNotices(rows);
        setLoading(false);
      },
      (err) => {
        console.error('Notices listener error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Publish Notice
  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Notice title is required');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'notices'), {
        title: formData.title.trim(),
        desc: formData.desc.trim(),
        description: formData.desc.trim(),
        dept: formData.dept,
        priority: formData.priority,
        expiry: formData.expiry,
        readBy: [],
        createdBy: userData?.name || user?.displayName || 'Central Admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'auditLogs'), {
        actorId: user?.uid || 'admin',
        actorRole: userData?.role || 'SUPER_ADMIN',
        action: 'NOTICE_PUBLISHED',
        entityType: 'NOTICE',
        timestamp: new Date().toISOString(),
        result: 'SUCCESS',
        details: { title: formData.title, priority: formData.priority, dept: formData.dept },
      }).catch(() => {});

      toast.success('Notice published to EMS portal in real time!');
      setShowModal(false);
      setFormData({
        title: '',
        desc: '',
        dept: 'All',
        priority: 'Normal',
        expiry: '',
      });
    } catch {
      toast.error('Failed to publish notice');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Notice
  const handleDeleteNotice = async (id: string, title: string) => {
    const ok = await confirmAction({
      title: 'Delete Notice',
      message: `Are you sure you want to delete notice "${title}"?`,
      confirmText: 'Delete Notice',
      confirmColor: 'var(--brand-red)',
    });
    if (!ok) return;

    try {
      await deleteDoc(doc(db, 'notices', id));
      toast.success('Notice deleted');
    } catch {
      toast.error('Failed to delete notice');
    }
  };

  const filtered = useMemo(() => {
    return notices.filter((n) => {
      const matchPriority = priorityFilter === 'ALL' || n.priority === priorityFilter;
      const matchSearch =
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.dept.toLowerCase().includes(searchTerm.toLowerCase());
      return matchPriority && matchSearch;
    });
  }, [notices, priorityFilter, searchTerm]);

  return (
    <AdminLayout>
      <div className="page-container" style={{ paddingBottom: 60 }}>
              {/* Header */}
              <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                  <h1 className="page-title">Company Notices & Bulletins</h1>
                  <p className="page-subtitle">Central bulletin board, organizational announcements & alerts</p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="btn btn-primary"
                  style={{ gap: 8, padding: '8px 16px', fontSize: 13 }}
                >
                  <Plus size={15} /> Publish Notice
                </button>
              </div>

              {/* Filters */}
              <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Search announcements by title or content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: 13 }}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Priority:</span>
                  <select
                    className="input-base"
                    style={{ padding: '6px 12px', fontSize: 12, width: 'auto' }}
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="Critical">Critical</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {/* Notices Cards Grid */}
              {loading ? (
                <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Loading real-time notices...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Megaphone size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No notices posted</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Click &quot;Publish Notice&quot; above to broadcast an announcement to EMS.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  {filtered.map((n) => {
                    const cfg = PRIORITY_BADGES[n.priority] || PRIORITY_BADGES.Normal;
                    const Icon = cfg.icon;

                    return (
                      <div
                        key={n.id}
                        className="card"
                        style={{
                          padding: 20,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          borderLeft: `3px solid ${cfg.color}`,
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span
                              className="badge"
                              style={{ background: cfg.bg, color: cfg.color, fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Icon size={11} /> {n.priority}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="badge badge-gray" style={{ fontSize: 10 }}>
                                {n.dept}
                              </span>
                              <button
                                onClick={() => handleDeleteNotice(n.id, n.title)}
                                className="btn btn-ghost"
                                style={{ padding: 4, color: 'var(--text-muted)' }}
                                onMouseOver={(e) => (e.currentTarget.style.color = 'var(--brand-red)')}
                                onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>
                            {n.title}
                          </h3>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                            {n.desc}
                          </p>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Eye size={12} /> {n.readBy?.length || 0} Acknowledged
                          </span>
                          {n.expiry && <span>Expires: {n.expiry}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

        {/* PUBLISH NOTICE MODAL */}
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
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Publish Notice</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Broadcast an announcement to all EMS employees
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ padding: 6 }}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handlePublishNotice} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Notice Title <span style={{ color: 'var(--brand-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="input-base"
                    placeholder="e.g. Office Holiday Schedule & Annual Meetup"
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Target Department
                    </label>
                    <select
                      className="input-base"
                      value={formData.dept}
                      onChange={(e) => setFormData((p) => ({ ...p, dept: e.target.value }))}
                    >
                      <option value="All">All Departments</option>
                      <option value="Developer">Developers</option>
                      <option value="Designer">Designers</option>
                      <option value="Project Manager">Project Managers</option>
                      <option value="Management">Management</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Priority Level
                    </label>
                    <select
                      className="input-base"
                      value={formData.priority}
                      onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value as any }))}
                    >
                      <option value="Normal">Normal</option>
                      <option value="Low">Low</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Notice Content <span style={{ color: 'var(--brand-red)' }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    className="input-base"
                    placeholder="Enter detailed announcement message..."
                    value={formData.desc}
                    onChange={(e) => setFormData((p) => ({ ...p, desc: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    className="input-base"
                    value={formData.expiry}
                    onChange={(e) => setFormData((p) => ({ ...p, expiry: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting} style={{ gap: 6 }}>
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
                    {submitting ? 'Publishing…' : 'Publish Notice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </AdminLayout>
  );
}
