'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { toast } from '@/components/ui/Toast';
import { confirmAction } from '@/components/ui/ConfirmModal';
import { db } from '@/lib/firebase/client';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '@/lib/auth/auth-context';
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  CheckSquare,
  X,
  Loader2,
  Trash2,
  Filter,
  Kanban,
  Table as TableIcon,
  ChevronDown,
} from 'lucide-react';

type Task = {
  id: string;
  title: string;
  desc?: string;
  deadline?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending' | 'In Progress' | 'Review' | 'Completed';
  assigneeId?: string;
  assigneeName?: string;
  progress?: number;
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
};

const STATUS_COLUMNS: { status: Task['status']; label: string; color: string }[] = [
  { status: 'Pending', label: 'Pending', color: 'var(--text-muted)' },
  { status: 'In Progress', label: 'In Progress', color: 'var(--accent-blue)' },
  { status: 'Review', label: 'In Review', color: 'var(--accent-amber)' },
  { status: 'Completed', label: 'Completed', color: 'var(--accent-green)' },
];

const PRIORITY_BADGES: Record<string, { bg: string; color: string }> = {
  Low: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' },
  Medium: { bg: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' },
  High: { bg: 'var(--accent-amber-dim)', color: 'var(--accent-amber)' },
  Critical: { bg: 'var(--accent-red-dim)', color: 'var(--brand-red)' },
};

const PROGRESS_MAP: Record<string, number> = {
  Pending: 0,
  'In Progress': 40,
  Review: 80,
  Completed: 100,
};

export default function TasksPage() {
  const { user, userData } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    desc: '',
    assigneeId: '',
    assigneeName: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    deadline: '',
  });

  // Drag and Drop
  const dragId = useRef<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);


  // Real-time Firestore Tasks listener
  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Task[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || '',
            desc: data.desc || '',
            deadline: data.deadline || '',
            priority: data.priority || 'Medium',
            status: data.status || 'Pending',
            assigneeId: data.assigneeId || data.assignedTo || '',
            assigneeName: data.assigneeName || 'Unassigned',
            progress: data.progress ?? 0,
            createdBy: data.createdBy || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setTasks(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to tasks:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Real-time Firestore Employees listener for assignment
  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const emps = snap.docs
          .map((d) => {
            const data = d.data();
            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || data.email || d.id;
            return {
              id: data.uid || d.id,
              name: fullName,
              email: data.email,
            };
          })
          .filter((e) => e.name);
        setEmployees(emps);
      },
      (err) => {
        console.error('Error loading employees for tasks:', err);
      }
    );
    return () => unsub();
  }, []);

  // Status Change Handler (Live Firestore Sync)
  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    const prev = tasks.find((t) => t.id === taskId);
    if (!prev || prev.status === newStatus) return;

    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: newStatus,
        progress: PROGRESS_MAP[newStatus] ?? prev.progress,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Task status updated to "${newStatus}"`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update status in database');
    }
  };

  // Delete Task Handler
  const handleDeleteTask = async (taskId: string, title: string) => {
    const ok = await confirmAction({
      title: 'Delete Task',
      message: `Are you sure you want to permanently delete task "${title}"?`,
      confirmText: 'Delete Task',
      confirmColor: 'var(--brand-red)',
    });
    if (!ok) return;

    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      toast.success('Task deleted successfully');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete task');
    }
  };

  // Create Task Handler
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    if (!formData.deadline) {
      toast.error('Please set a deadline date');
      return;
    }

    setSubmitting(true);
    try {
      const taskRef = await addDoc(collection(db, 'tasks'), {
        title: formData.title.trim(),
        desc: formData.desc.trim(),
        priority: formData.priority,
        deadline: formData.deadline,
        status: 'Pending',
        progress: 0,
        assigneeId: formData.assigneeId,
        assigneeName: formData.assigneeName || 'Unassigned',
        assignedTo: formData.assigneeId,
        companyId: 'default',
        createdBy: userData?.name || user?.displayName || 'Central Admin',
        createdByUid: user?.uid || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Send in-app notification if assignee selected
      if (formData.assigneeId) {
        await addDoc(collection(db, 'notifications'), {
          userId: formData.assigneeId,
          companyId: 'default',
          title: 'New Task Assigned',
          message: `Central Admin assigned: "${formData.title.trim()}"`,
          type: 'task',
          isRead: false,
          link: '/tasks',
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }

      toast.success('Task created and assigned successfully!');
      setShowModal(false);
      setFormData({
        title: '',
        desc: '',
        assigneeId: '',
        assigneeName: '',
        priority: 'Medium',
        deadline: '',
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.desc && t.desc.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.assigneeName && t.assigneeName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'Pending').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    review: tasks.filter((t) => t.status === 'Review').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
  };

  return (
    <AdminLayout>
      <div className="page-container">
              {/* Header */}
              <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                  <h1 className="page-title">Tasks Management</h1>
                  <p className="page-subtitle">Real-time bi-directional task sync with EMS Portal</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4, padding: 2 }}>
                    <button
                      onClick={() => setViewMode('kanban')}
                      className={`btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '6px 12px', fontSize: 12, gap: 6 }}
                    >
                      <Kanban size={13} /> Kanban
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '6px 12px', fontSize: 12, gap: 6 }}
                    >
                      <TableIcon size={13} /> Table
                    </button>
                  </div>

                  <button
                    onClick={() => setShowModal(true)}
                    className="btn btn-primary"
                    style={{ gap: 8, padding: '8px 16px', fontSize: 13 }}
                  >
                    <Plus size={15} /> Create Task
                  </button>
                </div>
              </div>

              {/* Status Metric Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Total Tasks', count: counts.total, color: 'var(--text-primary)' },
                  { label: 'Pending', count: counts.pending, color: 'var(--text-muted)' },
                  { label: 'In Progress', count: counts.inProgress, color: 'var(--accent-blue)' },
                  { label: 'In Review', count: counts.review, color: 'var(--accent-amber)' },
                  { label: 'Completed', count: counts.completed, color: 'var(--accent-green)' },
                ].map((item) => (
                  <div key={item.label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: item.color, marginTop: 4 }}>{item.count}</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                  </div>
                ))}
              </div>

              {/* Filter and Search Bar */}
              <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Search by title, description, or employee name..."
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
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Filter size={13} /> Status:
                  </span>
                  <select
                    className="input-base"
                    style={{ padding: '6px 12px', fontSize: 12, width: 'auto' }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">In Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Syncing real-time tasks from database...</span>
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredTasks.length === 0 && (
                <div className="card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <CheckSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No tasks found</div>
                  <div style={{ fontSize: 13 }}>Create a new task or adjust your filters above.</div>
                </div>
              )}

              {/* KANBAN VIEW */}
              {!loading && viewMode === 'kanban' && filteredTasks.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(280px, 1fr))', gap: 16, alignItems: 'start', overflowX: 'auto', paddingBottom: 16 }}>
                  {STATUS_COLUMNS.map((col) => {
                    const colTasks = filteredTasks.filter((t) => t.status === col.status);
                    const isOver = overCol === col.status;

                    return (
                      <div
                        key={col.status}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setOverCol(col.status);
                        }}
                        onDragLeave={() => setOverCol(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          const id = dragId.current;
                          if (id) handleStatusChange(id, col.status);
                          dragId.current = null;
                          setOverCol(null);
                        }}
                        style={{
                          background: isOver ? 'rgba(255,49,49,0.06)' : 'var(--bg-secondary)',
                          border: isOver ? '1px dashed var(--brand-red)' : '1px solid var(--border)',
                          borderRadius: 6,
                          padding: 12,
                          minHeight: 400,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {/* Column Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                              {col.label}
                            </span>
                          </div>
                          <span className="badge badge-gray" style={{ fontSize: 11, padding: '2px 8px' }}>
                            {colTasks.length}
                          </span>
                        </div>

                        {/* Task Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {colTasks.map((t) => (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={() => {
                                dragId.current = t.id;
                              }}
                              className="card"
                              style={{
                                padding: 14,
                                cursor: 'grab',
                                borderLeft: `3px solid ${PRIORITY_BADGES[t.priority || 'Medium']?.color || 'var(--border)'}`,
                                background: 'var(--bg-elevated)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <span
                                  className="badge"
                                  style={{
                                    background: PRIORITY_BADGES[t.priority || 'Medium']?.bg,
                                    color: PRIORITY_BADGES[t.priority || 'Medium']?.color,
                                    fontSize: 10,
                                    padding: '2px 6px',
                                  }}
                                >
                                  {t.priority}
                                </span>
                                <button
                                  onClick={() => handleDeleteTask(t.id, t.title)}
                                  title="Delete task"
                                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                                  onMouseOver={(e) => (e.currentTarget.style.color = 'var(--brand-red)')}
                                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>

                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.4 }}>
                                {t.title}
                              </div>

                              {t.desc && (
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5, maxHeight: 42, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {t.desc}
                                </div>
                              )}

                              {/* Progress Line */}
                              <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${t.progress}%`, background: col.color, transition: 'width 0.3s' }} />
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,49,49,0.15)', color: 'var(--brand-red)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                                    {t.assigneeName?.[0] || 'U'}
                                  </span>
                                  <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {t.assigneeName}
                                  </span>
                                </div>

                                {t.deadline && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <Clock size={11} /> {t.deadline}
                                  </span>
                                )}
                              </div>

                              {/* Quick Move Dropdown */}
                              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Change Status:</span>
                                <select
                                  value={t.status}
                                  onChange={(e) => handleStatusChange(t.id, e.target.value as Task['status'])}
                                  style={{
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 4,
                                    fontSize: 10,
                                    padding: '2px 6px',
                                    outline: 'none',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Review">Review</option>
                                  <option value="Completed">Completed</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TABLE VIEW */}
              {!loading && viewMode === 'table' && filteredTasks.length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Task Title</th>
                          <th>Assigned To</th>
                          <th>Priority</th>
                          <th>Deadline</th>
                          <th>Progress</th>
                          <th>Status (Syncs Live)</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.map((t) => (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              <div>{t.title}</div>
                              {t.desc && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>{t.desc}</div>}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,49,49,0.15)', color: 'var(--brand-red)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                                  {t.assigneeName?.[0] || 'U'}
                                </span>
                                <span>{t.assigneeName}</span>
                              </div>
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: PRIORITY_BADGES[t.priority || 'Medium']?.bg,
                                  color: PRIORITY_BADGES[t.priority || 'Medium']?.color,
                                  fontSize: 11,
                                }}
                              >
                                {t.priority}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.deadline || '—'}</td>
                            <td style={{ minWidth: 100 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${t.progress}%`, background: 'var(--brand-red)' }} />
                                </div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 28 }}>{t.progress}%</span>
                              </div>
                            </td>
                            <td>
                              <select
                                value={t.status}
                                onChange={(e) => handleStatusChange(t.id, e.target.value as Task['status'])}
                                style={{
                                  background: 'var(--bg-secondary)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 4,
                                  fontSize: 12,
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  outline: 'none',
                                }}
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Review">Review</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => handleDeleteTask(t.id, t.title)}
                                className="btn btn-ghost"
                                style={{ padding: '6px 8px', color: 'var(--brand-red)' }}
                                title="Delete task"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

        {/* CREATE TASK MODAL */}
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
                width: 520,
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
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Create & Assign Task</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    This task will sync in real time to the EMS portal and employee dashboard
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ padding: 6 }}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Task Title <span style={{ color: 'var(--brand-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="input-base"
                    placeholder="e.g. Build client billing export module"
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Assign To Employee <span style={{ color: 'var(--brand-red)' }}>*</span>
                  </label>
                  <select
                    required
                    className="input-base"
                    value={formData.assigneeId}
                    onChange={(e) => {
                      const emp = employees.find((em) => em.id === e.target.value);
                      setFormData((p) => ({
                        ...p,
                        assigneeId: e.target.value,
                        assigneeName: emp?.name || '',
                      }));
                    }}
                  >
                    <option value="">— Select an Employee —</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.email ? `(${emp.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="input-base"
                    placeholder="Provide detailed instructions or requirements for this task..."
                    value={formData.desc}
                    onChange={(e) => setFormData((p) => ({ ...p, desc: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Deadline <span style={{ color: 'var(--brand-red)' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="input-base"
                      value={formData.deadline}
                      onChange={(e) => setFormData((p) => ({ ...p, deadline: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Priority
                    </label>
                    <select
                      className="input-base"
                      value={formData.priority}
                      onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value as any }))}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting} style={{ gap: 6 }}>
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {submitting ? 'Creating…' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </AdminLayout>
  );
}
