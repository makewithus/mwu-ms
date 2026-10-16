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
  where,
  orderBy,
  doc,
  setDoc,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import {
  Clock,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Download,
  Loader2,
  PenLine,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';

type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  clockIn: string;
  clockOut: string;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Holiday';
  hoursWorked: string;
  manuallyMarked?: boolean;
  notes?: string;
};

type Employee = {
  id: string;
  uid?: string;
  employeeId: string;
  name: string;
  department: string;
  status: string;
};

const STATUS_BADGES: Record<string, { bg: string; color: string }> = {
  Present: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
  Absent: { bg: 'rgba(255, 49, 49, 0.15)', color: '#ff3131' },
  Late: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  'Half Day': { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
  Holiday: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
};

export default function AttendancePage() {
  const { user, userData } = useAuth();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceRecord['status']>('Present');
  const [editClockIn, setEditClockIn] = useState('09:30');
  const [editClockOut, setEditClockOut] = useState('18:30');
  const [editNotes, setEditNotes] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);


  // Real-time Employees Listener
  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Employee[] = snap.docs
          .map((d) => {
            const data = d.data();
            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || data.email || d.id;
            return {
              id: d.id,
              uid: data.uid || d.id,
              employeeId: data.employeeId || d.id.slice(0, 6).toUpperCase(),
              name: fullName,
              department: data.department || 'Other',
              status: data.status || 'Active',
            };
          })
          .filter((e) => e.status !== 'Archived');
        setEmployees(list);
      },
      (err) => console.error('Employees error in attendance:', err)
    );
    return () => unsub();
  }, []);

  // Real-time Attendance Listener for Selected Date
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'attendance'), where('date', '==', selectedDate));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: AttendanceRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            employeeId: data.employeeId || '',
            employeeName: data.employeeName || '',
            department: data.department || '',
            date: data.date || selectedDate,
            clockIn: data.clockIn || '',
            clockOut: data.clockOut || '',
            status: data.status || 'Absent',
            hoursWorked: data.hoursWorked || '—',
            manuallyMarked: data.manuallyMarked || false,
            notes: data.notes || '',
          };
        });
        setAttendanceRecords(rows);
        setLoading(false);
      },
      (err) => {
        console.error('Attendance error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [selectedDate]);

  // Combined Rows (Every active employee mapped against today's attendance record)
  const combinedRows = useMemo(() => {
    const recordMap = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((r) => {
      if (r.employeeId) recordMap.set(r.employeeId, r);
    });

    return employees.map((emp) => {
      const record = recordMap.get(emp.employeeId) || recordMap.get(emp.id) || null;
      return {
        emp,
        record,
        status: record ? record.status : ('Absent' as AttendanceRecord['status']),
        clockIn: record?.clockIn || '—',
        clockOut: record?.clockOut || '—',
        hoursWorked: record?.hoursWorked || '0h',
        notes: record?.notes || '',
      };
    });
  }, [employees, attendanceRecords]);

  // Filters
  const filteredRows = useMemo(() => {
    return combinedRows.filter((row) => {
      const matchSearch =
        row.emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.emp.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = departmentFilter === 'ALL' || row.emp.department === departmentFilter;
      const matchStatus = statusFilter === 'ALL' || row.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [combinedRows, searchTerm, departmentFilter, statusFilter]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Metrics
  const metrics = useMemo(() => {
    const total = employees.length || 1;
    const present = combinedRows.filter((r) => r.status === 'Present' || r.status === 'Late').length;
    const absent = combinedRows.filter((r) => r.status === 'Absent').length;
    const late = combinedRows.filter((r) => r.status === 'Late').length;
    const halfDay = combinedRows.filter((r) => r.status === 'Half Day').length;
    const rate = Math.round((present / total) * 100);

    return { total, present, absent, late, halfDay, rate };
  }, [employees, combinedRows]);

  // Mark Attendance Handler
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;

    setSavingAttendance(true);
    try {
      const docId = `${editingEmp.employeeId}_${selectedDate}`;
      const docRef = doc(db, 'attendance', docId);

      const payload = {
        employeeId: editingEmp.employeeId,
        employeeName: editingEmp.name,
        department: editingEmp.department,
        date: selectedDate,
        status: editStatus,
        clockIn: editStatus === 'Absent' ? '' : editClockIn,
        clockOut: editStatus === 'Absent' ? '' : editClockOut,
        hoursWorked: editStatus === 'Absent' ? '0h' : '8h 0m',
        manuallyMarked: true,
        markedBy: userData?.name || user?.displayName || 'Central Admin',
        markedByUid: user?.uid || '',
        notes: editNotes.trim(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(docRef, payload, { merge: true });

      await addDoc(collection(db, 'auditLogs'), {
        actorId: user?.uid || 'admin',
        actorRole: userData?.role || 'SUPER_ADMIN',
        action: 'ATTENDANCE_MARKED',
        entityType: 'ATTENDANCE',
        entityId: docId,
        timestamp: new Date().toISOString(),
        result: 'SUCCESS',
        details: { employee: editingEmp.name, status: editStatus, date: selectedDate },
      }).catch(() => {});

      toast.success(`Attendance updated for ${editingEmp.name}`);
      setEditingEmp(null);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update attendance');
    } finally {
      setSavingAttendance(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Employee ID', 'Name', 'Department', 'Date', 'Status', 'Clock In', 'Clock Out', 'Notes'];
    const rows = filteredRows.map((r) => [
      r.emp.employeeId,
      r.emp.name,
      r.emp.department,
      selectedDate,
      r.status,
      r.clockIn,
      r.clockOut,
      `"${r.notes.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="page-container" style={{ paddingBottom: 60 }}>
              {/* Header */}
              <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                  <h1 className="page-title">Attendance Control</h1>
                  <p className="page-subtitle">Central attendance monitoring, live verification & manual override</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="date"
                    className="input-base"
                    style={{ padding: '6px 12px', fontSize: 13, width: 'auto' }}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                  <button onClick={handleExportCSV} className="btn btn-secondary" style={{ gap: 6, padding: '7px 14px', fontSize: 12 }}>
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              </div>

              {/* Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Total Headcount', value: String(metrics.total), color: 'var(--text-primary)', icon: Users },
                  { label: 'Present Today', value: String(metrics.present), color: '#22c55e', icon: CheckCircle2 },
                  { label: 'Absent Today', value: String(metrics.absent), color: '#ff3131', icon: XCircle },
                  { label: 'Late Arrival', value: String(metrics.late), color: '#f59e0b', icon: AlertTriangle },
                  { label: 'Attendance Rate', value: `${metrics.rate}%`, color: 'var(--brand-red)', icon: Clock },
                ].map((m) => (
                  <div key={m.label} className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: m.color, marginTop: 4 }}>{m.value}</div>
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: 6, background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <m.icon size={17} color={m.color} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Filter Bar */}
              <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Search by employee name, ID, or department..."
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

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Department:</span>
                    <select
                      className="input-base"
                      style={{ padding: '6px 10px', fontSize: 12, width: 'auto' }}
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                    >
                      <option value="ALL">All Departments</option>
                      {departments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status:</span>
                    <select
                      className="input-base"
                      style={{ padding: '6px 10px', fontSize: 12, width: 'auto' }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Late">Late</option>
                      <option value="Half Day">Half Day</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading real-time attendance records...</span>
                  </div>
                ) : filteredRows.length === 0 ? (
                  <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Clock size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No attendance records found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Adjust your search or date filter above.</div>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Department</th>
                          <th>Status (Live Sync)</th>
                          <th>Clock In</th>
                          <th>Clock Out</th>
                          <th>Hours</th>
                          <th>Notes</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row) => (
                          <tr key={row.emp.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                  style={{
                                    width: 28,
                                    height: 28,
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
                                  {row.emp.name[0] || 'E'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{row.emp.name}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.emp.employeeId}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-gray" style={{ fontSize: 11 }}>
                                {row.emp.department}
                              </span>
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: STATUS_BADGES[row.status]?.bg || 'rgba(255,255,255,0.06)',
                                  color: STATUS_BADGES[row.status]?.color || 'var(--text-muted)',
                                  fontSize: 11,
                                }}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.clockIn}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.clockOut}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.hoursWorked}</td>
                            <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.notes || '—'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => {
                                  setEditingEmp(row.emp);
                                  setEditStatus(row.status);
                                  setEditClockIn(row.record?.clockIn || '09:30');
                                  setEditClockOut(row.record?.clockOut || '18:30');
                                  setEditNotes(row.record?.notes || '');
                                }}
                                className="btn btn-ghost"
                                style={{ padding: '6px 12px', fontSize: 11, gap: 5 }}
                              >
                                <PenLine size={12} /> Override
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

        {/* OVERRIDE ATTENDANCE MODAL */}
        {editingEmp && (
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
            onClick={() => setEditingEmp(null)}
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
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Override Attendance</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    For {editingEmp.name} ({editingEmp.employeeId}) on {selectedDate}
                  </p>
                </div>
                <button onClick={() => setEditingEmp(null)} className="btn btn-ghost" style={{ padding: 6 }}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveAttendance} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Status <span style={{ color: 'var(--brand-red)' }}>*</span>
                  </label>
                  <select
                    className="input-base"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Holiday">Holiday</option>
                  </select>
                </div>

                {editStatus !== 'Absent' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                        Clock In
                      </label>
                      <input
                        type="time"
                        className="input-base"
                        value={editClockIn}
                        onChange={(e) => setEditClockIn(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                        Clock Out
                      </label>
                      <input
                        type="time"
                        className="input-base"
                        value={editClockOut}
                        onChange={(e) => setEditClockOut(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Admin Notes / Justification
                  </label>
                  <textarea
                    rows={3}
                    className="input-base"
                    placeholder="Reason for manual attendance override..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingEmp(null)} disabled={savingAttendance}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingAttendance} style={{ gap: 6 }}>
                    {savingAttendance ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {savingAttendance ? 'Saving…' : 'Save Attendance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </AdminLayout>
  );
}
