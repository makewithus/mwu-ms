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
} from 'firebase/firestore';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Check,
  X,
  Loader2,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';

type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  reviewedBy?: string;
  reviewedAt?: any;
  createdAt?: any;
};

const STATUS_BADGES: Record<string, { bg: string; color: string }> = {
  Pending: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  Approved: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
  Rejected: { bg: 'rgba(255, 49, 49, 0.15)', color: '#ff3131' },
  Cancelled: { bg: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-muted)' },
};

const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Paid Leave', 'Vacation', 'Emergency Leave', 'Maternity/Paternity'];

export default function LeavesPage() {
  const { user, userData } = useAuth();

  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; department: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Grant Leave Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newLeave, setNewLeave] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    leaveType: 'Casual Leave',
    startDate: '',
    endDate: '',
    days: 1,
    reason: '',
  });


  // Real-time Leaves Listener
  useEffect(() => {
    const q = query(collection(db, 'leaveRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: LeaveRequest[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            employeeId: data.employeeId || '',
            employeeName: data.employeeName || 'Employee',
            department: data.department || 'Other',
            leaveType: data.leaveType || 'General',
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            days: data.days || 1,
            reason: data.reason || '',
            status: data.status || 'Pending',
            reviewedBy: data.reviewedBy,
            reviewedAt: data.reviewedAt,
            createdAt: data.createdAt,
          };
        });
        setRequests(rows);
        setLoading(false);
      },
      (err) => {
        console.error('Leave requests fetch error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Real-time Employees for Grant Leave dropdown
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
              id: data.employeeId || d.id,
              name: fullName,
              department: data.department || 'Other',
            };
          })
          .filter((e) => e.name);
        setEmployees(emps);
      },
      (err) => console.error('Employees error in leaves:', err)
    );
    return () => unsub();
  }, []);

  // Approve / Reject Handler
  const handleReviewAction = async (id: string, action: 'Approved' | 'Rejected') => {
    setProcessingId(id);
    try {
      await updateDoc(doc(db, 'leaveRequests', id), {
        status: action,
        reviewedBy: userData?.name || user?.displayName || 'Central Admin',
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'auditLogs'), {
        actorId: user?.uid || 'admin',
        actorRole: userData?.role || 'SUPER_ADMIN',
        action: `LEAVE_${action.toUpperCase()}`,
        entityType: 'LEAVE',
        entityId: id,
        timestamp: new Date().toISOString(),
        result: 'SUCCESS',
      }).catch(() => {});

      toast.success(`Leave request ${action.toLowerCase()} successfully!`);
    } catch {
      toast.error('Failed to update leave request status');
    } finally {
      setProcessingId(null);
    }
  };

  // Grant Leave on Behalf of Employee
  const handleGrantLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeave.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!newLeave.startDate || !newLeave.endDate) {
      toast.error('Please select valid start and end dates');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'leaveRequests'), {
        employeeId: newLeave.employeeId,
        employeeName: newLeave.employeeName,
        department: newLeave.department,
        leaveType: newLeave.leaveType,
        startDate: newLeave.startDate,
        endDate: newLeave.endDate,
        days: Number(newLeave.days) || 1,
        reason: newLeave.reason.trim() || 'Granted by Central Admin',
        status: 'Approved',
        reviewedBy: userData?.name || user?.displayName || 'Central Admin',
        reviewedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'auditLogs'), {
        actorId: user?.uid || 'admin',
        actorRole: userData?.role || 'SUPER_ADMIN',
        action: 'LEAVE_GRANTED_BY_ADMIN',
        entityType: 'LEAVE',
        timestamp: new Date().toISOString(),
        result: 'SUCCESS',
        details: { employee: newLeave.employeeName, type: newLeave.leaveType, days: newLeave.days },
      }).catch(() => {});

      toast.success(`Leave granted to ${newLeave.employeeName}!`);
      setShowModal(false);
      setNewLeave({
        employeeId: '',
        employeeName: '',
        department: '',
        leaveType: 'Casual Leave',
        startDate: '',
        endDate: '',
        days: 1,
        reason: '',
      });
    } catch {
      toast.error('Failed to grant leave');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchTab = activeTab === 'All' || r.status === activeTab;
      const matchSearch =
        r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.leaveType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.department.toLowerCase().includes(searchTerm.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [requests, activeTab, searchTerm]);

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'Pending').length,
    approved: requests.filter((r) => r.status === 'Approved').length,
    rejected: requests.filter((r) => r.status === 'Rejected').length,
    cancelled: requests.filter((r) => r.status === 'Cancelled').length,
  };

  return (
    <AdminLayout>
      <div className="page-container" style={{ paddingBottom: 60 }}>
              {/* Header */}
              <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                  <h1 className="page-title">Leaves Management</h1>
                  <p className="page-subtitle">Central review, approvals, and employee leave records</p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="btn btn-primary"
                  style={{ gap: 8, padding: '8px 16px', fontSize: 13 }}
                >
                  <Plus size={15} /> Grant Leave
                </button>
              </div>

              {/* Status Summary Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Total Requests', count: counts.all, color: 'var(--text-primary)' },
                  { label: 'Pending Approval', count: counts.pending, color: '#f59e0b' },
                  { label: 'Approved Leaves', count: counts.approved, color: '#22c55e' },
                  { label: 'Rejected Leaves', count: counts.rejected, color: '#ff3131' },
                ].map((c) => (
                  <div key={c.label} className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: c.color, marginTop: 4 }}>{c.count}</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                  </div>
                ))}
              </div>

              {/* Tabs and Search Bar */}
              <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '5px 12px', fontSize: 12 }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div style={{ position: 'relative', minWidth: 240 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search by employee, leave type, department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-base"
                    style={{ padding: '6px 10px 6px 32px', fontSize: 12, width: '100%' }}
                  />
                </div>
              </div>

              {/* Leave Requests Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading real-time leave requests...</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <CalendarDays size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No leave records found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>No requests match the selected tab or search query.</div>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Department</th>
                          <th>Leave Type</th>
                          <th>Dates</th>
                          <th>Duration</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    background: 'rgba(255,49,49,0.15)',
                                    color: 'var(--brand-red)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10,
                                    fontWeight: 700,
                                  }}
                                >
                                  {r.employeeName[0] || 'E'}
                                </div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{r.employeeName}</span>
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-gray" style={{ fontSize: 11 }}>
                                {r.department}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{r.leaveType}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {r.startDate} → {r.endDate}
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.days} day(s)</td>
                            <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.reason || '—'}
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: STATUS_BADGES[r.status]?.bg || 'rgba(255,255,255,0.06)',
                                  color: STATUS_BADGES[r.status]?.color || 'var(--text-muted)',
                                  fontSize: 11,
                                }}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {r.status === 'Pending' ? (
                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                  <button
                                    onClick={() => handleReviewAction(r.id, 'Approved')}
                                    disabled={processingId === r.id}
                                    className="btn btn-primary"
                                    style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}
                                  >
                                    <Check size={11} /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleReviewAction(r.id, 'Rejected')}
                                    disabled={processingId === r.id}
                                    className="btn btn-danger"
                                    style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}
                                  >
                                    <X size={11} /> Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {r.reviewedBy ? `Reviewed by ${r.reviewedBy}` : 'Processed'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

        {/* GRANT LEAVE MODAL */}
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
                width: 500,
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
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Grant Employee Leave</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Directly grant an approved leave to an employee
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ padding: 6 }}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleGrantLeave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Select Employee <span style={{ color: 'var(--brand-red)' }}>*</span>
                  </label>
                  <select
                    required
                    className="input-base"
                    value={newLeave.employeeId}
                    onChange={(e) => {
                      const emp = employees.find((em) => em.id === e.target.value);
                      setNewLeave((p) => ({
                        ...p,
                        employeeId: e.target.value,
                        employeeName: emp?.name || '',
                        department: emp?.department || 'Other',
                      }));
                    }}
                  >
                    <option value="">— Select an Employee —</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Leave Type
                    </label>
                    <select
                      className="input-base"
                      value={newLeave.leaveType}
                      onChange={(e) => setNewLeave((p) => ({ ...p, leaveType: e.target.value }))}
                    >
                      {LEAVE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="input-base"
                      value={newLeave.days}
                      onChange={(e) => setNewLeave((p) => ({ ...p, days: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Start Date <span style={{ color: 'var(--brand-red)' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="input-base"
                      value={newLeave.startDate}
                      onChange={(e) => setNewLeave((p) => ({ ...p, startDate: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      End Date <span style={{ color: 'var(--brand-red)' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="input-base"
                      value={newLeave.endDate}
                      onChange={(e) => setNewLeave((p) => ({ ...p, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Reason / Administrative Note
                  </label>
                  <textarea
                    rows={3}
                    className="input-base"
                    placeholder="Enter reason for leave grant..."
                    value={newLeave.reason}
                    onChange={(e) => setNewLeave((p) => ({ ...p, reason: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting} style={{ gap: 6 }}>
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {submitting ? 'Granting…' : 'Grant Leave'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </AdminLayout>
  );
}
