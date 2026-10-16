'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { apiGet, getCachedApiData } from '@/lib/api-client';
import AdminLayout from '@/components/layout/AdminLayout';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth/auth-context';
import { db } from '@/lib/firebase/client';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import {
  Activity,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Users,
  Clock,
  CalendarDays,
  DollarSign,
  FolderOpen,
  Cake,
  Megaphone,
  ListTodo,
  Check,
  X,
  Loader2,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const PIE_COLORS = [
  'var(--brand-red)',
  '#22c55e',
  '#f59e0b',
  '#3b82f6',
  '#a855f7',
  'var(--text-secondary)',
];

const tooltipStyle = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  fontSize: 12,
  color: 'var(--text-primary)',
};

const PROGRESS_MAP: Record<string, number> = {
  Pending: 0,
  'In Progress': 40,
  Review: 80,
  Completed: 100,
};

const PRIORITY_BADGES: Record<string, { bg: string; color: string }> = {
  Low: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' },
  Medium: { bg: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' },
  High: { bg: 'var(--accent-amber-dim)', color: 'var(--accent-amber)' },
  Critical: { bg: 'var(--accent-red-dim)', color: 'var(--brand-red)' },
};

type LeaveRequest = {
  id: string;
  name: string;
  type: string;
  days: string;
  date: string;
  status: string;
};

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
};

export default function DashboardPage() {
  const { loading: authLoading, user, userData } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Original Central Admin Data
  const [centralData, setCentralData] = useState<any>(() => getCachedApiData('/api/dashboard/stats'));
  const [centralLoading, setCentralLoading] = useState(() => !getCachedApiData('/api/dashboard/stats'));

  // EMS Real-Time States
  const [employeeCount, setEmployeeCount] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [noticeCount, setNoticeCount] = useState(0);
  const [payrollTotal, setPayrollTotal] = useState(0);
  const [birthdayCount, setBirthdayCount] = useState(0);

  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);
  const [processingLeaveId, setProcessingLeaveId] = useState<string | null>(null);

  const [departmentData, setDepartmentData] = useState<{ name: string; count: number }[]>([]);
  const [growthData, setGrowthData] = useState<{ month: string; employees: number }[]>([]);
  const [attendanceData, setAttendanceData] = useState<{ day: string; present: number; absent: number; late: number }[]>([]);
  const [leaveTypeData, setLeaveTypeData] = useState<{ name: string; value: number; color: string }[]>([]);

  // Tasks Real-time States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'Pending' | 'In Progress' | 'Review' | 'Completed'>('ALL');
  const [taskSearch, setTaskSearch] = useState('');
  const [employeesList, setEmployeesList] = useState<{ id: string; name: string }[]>([]);

  // Quick Task Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    desc: '',
    assigneeId: '',
    assigneeName: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    deadline: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Central Admin Server Stats (Clients, Projects, Integrations, Audit Activity)
  useEffect(() => {
    if (authLoading || !user) return;

    apiGet('/api/dashboard/stats')
      .then((d) => {
        setCentralData(d);
        setCentralLoading(false);
      })
      .catch((e) => {
        console.error('Failed to load stats', e);
        setCentralLoading(false);
      });
  }, [authLoading, user]);

  /* ─────────────────────────────────────────────────────────────
     1. Real-time Employees (Count, Growth, Departments, Birthdays)
     ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const allEmps = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const activeEmps = allEmps.filter((e) => e.status !== 'Archived');
        setEmployeeCount(activeEmps.length);

        // Employee picker list
        const pickerList = activeEmps.map((e) => ({
          id: e.uid || e.id,
          name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.name || e.email || e.id,
        }));
        setEmployeesList(pickerList);

        // Department breakdown
        const deptMap: Record<string, number> = {};
        activeEmps.forEach((e) => {
          const dept = e.department || 'Other';
          deptMap[dept] = (deptMap[dept] || 0) + 1;
        });
        setDepartmentData(Object.entries(deptMap).map(([name, count]) => ({ name, count })));

        // Employee growth by month
        const monthMap: Record<string, number> = {};
        activeEmps.forEach((e) => {
          if (!e.createdAt) return;
          const d = e.createdAt.toDate ? e.createdAt.toDate() : new Date(e.createdAt);
          const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
          monthMap[key] = (monthMap[key] || 0) + 1;
        });
        let running = 0;
        const cumulative = Object.entries(monthMap).map(([month, employees]) => {
          running += employees;
          return { month, employees: running };
        });
        setGrowthData(cumulative.slice(-6));

        // Birthdays this week
        const today = new Date();
        const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        let bdays = 0;
        activeEmps.forEach((e) => {
          if (!e.dob) return;
          const dob = new Date(e.dob);
          const thisYearBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          if (thisYearBday >= today && thisYearBday <= weekEnd) bdays++;
        });
        setBirthdayCount(bdays);
      },
      (err) => console.error('Employees listener error:', err)
    );
    return () => unsub();
  }, []);

  /* ─────────────────────────────────────────────────────────────
     2. Today's Attendance Stats (Real-Time)
     ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const q = query(collection(db, 'attendance'), where('date', '==', todayStr));
    const unsub = onSnapshot(
      q,
      (snap) => {
        let present = 0;
        snap.docs.forEach((d) => {
          const s = d.data().status ?? '';
          if (s === 'Present' || s === 'Late') present++;
        });
        setPresentCount(present);
      },
      () => {}
    );
    return () => unsub();
  }, []);

  /* ─────────────────────────────────────────────────────────────
     3. Weekly Attendance Trend (Mon - Sun, Real-Time)
     ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);

    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDates.push(d.toISOString().split('T')[0]);
    }

    if (weekDates.length === 0) return;

    const q = query(collection(db, 'attendance'), where('date', 'in', weekDates));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const dayMap: Record<string, { present: number; absent: number; late: number }> = {};
        weekDates.forEach((dateStr) => {
          dayMap[dateStr] = { present: 0, absent: 0, late: 0 };
        });
        snap.docs.forEach((d) => {
          const data = d.data();
          const date = data.date;
          if (!dayMap[date]) return;
          if (data.status === 'Present') dayMap[date].present++;
          else if (data.status === 'Late') {
            dayMap[date].present++;
            dayMap[date].late++;
          } else if (data.status === 'Absent') dayMap[date].absent++;
        });
        const result = weekDates.map((dateStr, i) => ({
          day: days[i],
          ...dayMap[dateStr],
        }));
        setAttendanceData(result);
      },
      () => {}
    );
    return () => unsub();
  }, []);

  /* ─────────────────────────────────────────────────────────────
     4. Leave Type Distribution (Real-Time)
     ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'leaveRequests'),
      (snap) => {
        const typeMap: Record<string, number> = {};
        snap.docs.forEach((d) => {
          const t = d.data().leaveType ?? 'Other';
          typeMap[t] = (typeMap[t] || 0) + 1;
        });
        const arr = Object.entries(typeMap).map(([name, value], i) => ({
          name,
          value,
          color: PIE_COLORS[i % PIE_COLORS.length],
        }));
        setLeaveTypeData(arr);
      },
      () => {}
    );
    return () => unsub();
  }, []);

  /* ─────────────────────────────────────────────────────────────
     5. Documents & Notices & Payroll (Real-Time)
     ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const unsubDocs = onSnapshot(collection(db, 'documents'), (snap) => setDocumentCount(snap.size), () => {});

    const unsubNotices = onSnapshot(
      collection(db, 'notices'),
      (snap) => {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        let newCount = 0;
        snap.docs.forEach((d) => {
          const data = d.data();
          const created = data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt ? new Date(data.createdAt) : null;
          if (created && created >= weekAgo) newCount++;
        });
        setNoticeCount(newCount);
      },
      () => {}
    );

    const now = new Date();
    const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const qPayroll = query(collection(db, 'payroll'), where('month', '==', monthLabel));
    const unsubPayroll = onSnapshot(
      qPayroll,
      (snap) => {
        const total = snap.docs.reduce((sum, d) => sum + (d.data().net ?? 0), 0);
        setPayrollTotal(total);
      },
      () => {}
    );

    return () => {
      unsubDocs();
      unsubNotices();
      unsubPayroll();
    };
  }, []);

  /* ─────────────────────────────────────────────────────────────
     6. Pending Leave Requests (Real-Time with Action Buttons)
     ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const q = query(collection(db, 'leaveRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: LeaveRequest[] = snap.docs
          .map((d) => {
            const data = d.data();
            const start = data.startDate ?? '';
            const end = data.endDate ?? '';
            const fmt = (s: string) =>
              s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            return {
              id: d.id,
              name: data.employeeName ?? 'Employee',
              type: data.leaveType ?? '',
              days: `${data.days ?? 1} day${(data.days ?? 1) > 1 ? 's' : ''}`,
              date: start === end || !end ? fmt(start) : `${fmt(start)}–${fmt(end)}`,
              status: data.status ?? 'Pending',
            };
          })
          .filter((r) => r.status === 'Pending');

        setPendingLeaves(rows);
        setLoadingLeaves(false);
      },
      () => {
        setPendingLeaves([]);
        setLoadingLeaves(false);
      }
    );
    return () => unsub();
  }, []);

  const handleLeaveAction = async (id: string, action: 'Approved' | 'Rejected') => {
    setProcessingLeaveId(id);
    try {
      await updateDoc(doc(db, 'leaveRequests', id), {
        status: action,
        reviewedBy: userData?.name || user?.displayName || 'Central Admin',
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Write audit log
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
      toast.error('Failed to update leave request.');
    } finally {
      setProcessingLeaveId(null);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     7. Live Tasks Listener (REAL-TIME BI-DIRECTIONAL SYNC)
     ───────────────────────────────────────────────────────────── */
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
          };
        });
        setTasks(list);
        setLoadingTasks(false);
      },
      (err) => {
        console.error('Error listening to tasks on dashboard:', err);
        setLoadingTasks(false);
      }
    );
    return () => unsub();
  }, []);

  // Update Task Status Live from Dashboard
  const handleTaskStatusUpdate = async (taskId: string, newStatus: Task['status']) => {
    const prev = tasks.find((t) => t.id === taskId);
    if (!prev || prev.status === newStatus) return;

    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: newStatus,
        progress: PROGRESS_MAP[newStatus] ?? prev.progress,
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'auditLogs'), {
        actorId: user?.uid || 'admin',
        actorRole: userData?.role || 'SUPER_ADMIN',
        action: 'TASK_STATUS_CHANGED',
        entityType: 'TASK',
        entityId: taskId,
        details: { from: prev.status, to: newStatus, title: prev.title },
        timestamp: new Date().toISOString(),
        result: 'SUCCESS',
      }).catch(() => {});

      toast.success(`Task status updated to "${newStatus}"!`);
    } catch {
      toast.error('Failed to update task status.');
    }
  };

  // Quick Task Create from Dashboard Modal
  const handleQuickTaskCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    if (!newTask.deadline) {
      toast.error('Please select a deadline');
      return;
    }

    setSubmittingTask(true);
    try {
      await addDoc(collection(db, 'tasks'), {
        title: newTask.title.trim(),
        desc: newTask.desc.trim(),
        deadline: newTask.deadline,
        priority: newTask.priority,
        status: 'Pending',
        progress: 0,
        assigneeId: newTask.assigneeId,
        assigneeName: newTask.assigneeName || 'Unassigned',
        assignedTo: newTask.assigneeId,
        companyId: 'default',
        createdBy: userData?.name || user?.displayName || 'Central Admin',
        createdByUid: user?.uid || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (newTask.assigneeId) {
        await addDoc(collection(db, 'notifications'), {
          userId: newTask.assigneeId,
          companyId: 'default',
          title: 'New Task Assigned',
          message: `Central Admin assigned: "${newTask.title.trim()}"`,
          type: 'task',
          isRead: false,
          link: '/tasks',
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }

      toast.success('Task created and reflected across all dashboards!');
      setShowTaskModal(false);
      setNewTask({
        title: '',
        desc: '',
        assigneeId: '',
        assigneeName: '',
        priority: 'Medium',
        deadline: '',
      });
    } catch {
      toast.error('Failed to create task');
    } finally {
      setSubmittingTask(false);
    }
  };

  const formatPayroll = (n: number) => {
    if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n}`;
  };

  // Original Central Admin 4 stats
  const centralStats = [
    { id: 'clients', label: 'Total Clients', value: centralData?.stats?.clients ?? '-', icon: Activity, badge: 'CMS' },
    { id: 'employees', label: 'Total Employees', value: employeeCount || centralData?.stats?.employees || '-', icon: CheckCircle2, badge: 'EMS' },
    { id: 'projects', label: 'Total Projects', value: centralData?.stats?.projects ?? '-', icon: Clock3, badge: 'LIVE' },
    { id: 'integrations', label: 'Pending Integrations', value: centralData?.stats?.integrations ?? '-', icon: DatabaseZap, badge: 'SYNC' },
  ];

  // All EMS Admin Dashboard Stats
  const emsStats = [
    { label: "Today's Attendance", value: `${presentCount}/${employeeCount || 1}`, icon: Clock, color: 'var(--accent-green)', delta: `${Math.max(0, employeeCount - presentCount)} absent or pending` },
    { label: 'Pending Leaves', value: String(pendingLeaves.length), icon: CalendarDays, color: 'var(--accent-amber)', delta: 'Requires HR approval' },
    { label: 'Payroll This Month', value: payrollTotal > 0 ? formatPayroll(payrollTotal) : '—', icon: DollarSign, color: 'var(--text-primary)', delta: new Date().toLocaleString('default', { month: 'long' }) },
    { label: 'EMS Documents', value: String(documentCount), icon: FolderOpen, color: 'var(--accent-blue)', delta: 'Total files in portal' },
    { label: 'Birthdays This Week', value: String(birthdayCount), icon: Cake, color: 'var(--accent-amber)', delta: birthdayCount > 0 ? 'Upcoming celebrations' : 'No birthdays' },
    { label: 'New Notices', value: String(noticeCount), icon: Megaphone, color: 'var(--brand-red)', delta: 'This week' },
  ];

  // Tasks Filter
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        (t.desc && t.desc.toLowerCase().includes(taskSearch.toLowerCase())) ||
        (t.assigneeName && t.assigneeName.toLowerCase().includes(taskSearch.toLowerCase()));
      const matchStatus = taskFilter === 'ALL' || t.status === taskFilter;
      return matchSearch && matchStatus;
    });
  }, [tasks, taskSearch, taskFilter]);

  const taskCounts = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'Pending').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    review: tasks.filter((t) => t.status === 'Review').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
  };

  const activity = centralData?.activity || [];

  return (
    <AdminLayout>
      <div className="page-container" style={{ paddingBottom: 60 }}>
              {/* Header */}
              <div className="page-header" style={{ marginBottom: 24 }}>
                <div>
                  <h1 className="page-title">
                    {userData?.role === 'MANAGER' ? 'Manager Dashboard' : 'Central Admin'}
                  </h1>
                  <p className="page-subtitle">Unified command center for MakeWithUs operations & real-time EMS sync</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'none', md: 'block' } as any}>
                    {new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  {userData?.role && (
                    <div className={`badge ${userData.role === 'SUPER_ADMIN' ? 'badge-red' : 'badge-gray'}`}>
                      {userData.role.replace('_', ' ')}
                    </div>
                  )}
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 1: ORIGINAL CENTRAL ADMIN STATS
                  ───────────────────────────────────────────────────────────── */}
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Core System Metrics
                </span>
                <span className="badge badge-green" style={{ fontSize: 10 }}>LIVE SYNC</span>
              </div>

              <section className="stats-grid" style={{ marginBottom: 24 }}>
                {centralStats.map(({ id, label, value, icon: Icon, badge }) => (
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

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 2: ALL EMS ADMIN STATS (REAL-TIME DB)
                  ───────────────────────────────────────────────────────────── */}
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    EMS Portal Metrics
                  </span>
                  <span className="badge" style={{ background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)', fontSize: 10 }}>
                    REAL-TIME
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-refreshed via Firebase Firestore</div>
              </div>

              <div className="stats-grid" style={{ marginBottom: 28, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                {emsStats.map((s) => (
                  <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background: `${s.color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <s.icon size={16} color={s.color} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.2 }}>{s.label}</div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: 4 }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.delta}</div>
                  </div>
                ))}
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 3: REAL-TIME EMS CHARTS (ROW 1 & ROW 2)
                  ───────────────────────────────────────────────────────────── */}
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Workforce & Attendance Analytics
                </span>
              </div>

              {/* Charts Row 1: Weekly Attendance & Employee Growth */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 16 }}>
                {/* Attendance Trend */}
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Weekly Attendance</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Present vs Absent vs Late (This Week)</div>
                    </div>
                    <BarChart2 size={16} color="var(--brand-red)" />
                  </div>
                  {attendanceData.length === 0 || !mounted ? (
                    <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No attendance recorded this week
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={attendanceData} barSize={10} barGap={3}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--bg-secondary)' }} />
                        <Bar dataKey="present" fill="var(--text-primary)" name="Present" />
                        <Bar dataKey="absent" fill="var(--brand-red)" name="Absent" />
                        <Bar dataKey="late" fill="var(--text-muted)" name="Late" />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 8 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Employee Growth */}
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Employee Growth</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Headcount trajectory (Last 6 months)</div>
                    </div>
                    <TrendingUp size={16} color="var(--accent-green)" />
                  </div>
                  {growthData.length === 0 || !mounted ? (
                    <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No employee growth data yet
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={210}>
                      <AreaChart data={growthData}>
                        <defs>
                          <linearGradient id="centralEmpGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff3131" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ff3131" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area type="monotone" dataKey="employees" stroke="var(--brand-red)" fill="url(#centralEmpGrad)" strokeWidth={2} dot={{ r: 3, fill: 'var(--brand-red)' }} name="Employees" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Charts Row 2: Department Breakdown & Leave Distribution */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 28 }}>
                {/* Dept Breakdown */}
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Employees by Department</div>
                  {departmentData.length === 0 || !mounted ? (
                    <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No department data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={departmentData} layout="vertical" barSize={12}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={110} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--bg-secondary)' }} />
                        <Bar dataKey="count" fill="var(--text-primary)" name="Employees" radius={[0, 2, 2, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Leave Distribution */}
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Leave Distribution</div>
                    <PieChartIcon size={16} color="var(--accent-amber)" />
                  </div>
                  {leaveTypeData.length === 0 || !mounted ? (
                    <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No leave requests filed yet
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ flex: 1, height: 170 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={leaveTypeData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" paddingAngle={4}>
                              {leaveTypeData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ width: 140, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {leaveTypeData.map((d) => (
                          <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 4: REAL-TIME TASKS INTEGRATION (CRITICAL USER REQUEST)
                  ───────────────────────────────────────────────────────────── */}
              <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                        Live Task Management
                      </h2>
                      <span className="badge badge-red" style={{ fontSize: 10 }}>
                        EMS REAL-TIME SYNC
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Tasks created or updated in EMS portal are synchronized instantly here. Status changes reflect in real time.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Link href="/tasks" className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12, gap: 6 }}>
                      Full Kanban <ExternalLink size={12} />
                    </Link>
                    <button
                      onClick={() => setShowTaskModal(true)}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: 12, gap: 6 }}
                    >
                      <Plus size={14} /> Assign Task
                    </button>
                  </div>
                </div>

                {/* Task Status Filters & Search Bar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { id: 'ALL', label: `All (${taskCounts.total})` },
                      { id: 'Pending', label: `Pending (${taskCounts.pending})` },
                      { id: 'In Progress', label: `In Progress (${taskCounts.inProgress})` },
                      { id: 'Review', label: `Review (${taskCounts.review})` },
                      { id: 'Completed', label: `Done (${taskCounts.completed})` },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setTaskFilter(f.id as any)}
                        className={`btn ${taskFilter === f.id ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '4px 10px', fontSize: 11 }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ position: 'relative', minWidth: 200 }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      className="input-base"
                      style={{ padding: '5px 10px 5px 30px', fontSize: 11, width: 220 }}
                    />
                  </div>
                </div>

                {/* Tasks Table */}
                {loadingTasks ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 8, color: 'var(--text-muted)' }}>
                    <Loader2 size={16} className="animate-spin" />
                    <span style={{ fontSize: 13 }}>Syncing live tasks...</span>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    No tasks found matching filter.
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Task Title</th>
                          <th>Assignee (EMS User)</th>
                          <th>Priority</th>
                          <th>Deadline</th>
                          <th>Progress</th>
                          <th>Live Status (Changes sync to EMS)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.slice(0, 8).map((t) => (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              <div>{t.title}</div>
                              {t.desc && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {t.desc}
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    background: 'rgba(255,49,49,0.15)',
                                    color: 'var(--brand-red)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10,
                                    fontWeight: 700,
                                  }}
                                >
                                  {t.assigneeName?.[0] || 'U'}
                                </span>
                                <span style={{ fontSize: 12 }}>{t.assigneeName}</span>
                              </div>
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: PRIORITY_BADGES[t.priority || 'Medium']?.bg,
                                  color: PRIORITY_BADGES[t.priority || 'Medium']?.color,
                                  fontSize: 10,
                                }}
                              >
                                {t.priority}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.deadline || '—'}</td>
                            <td style={{ minWidth: 90 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${t.progress}%`, background: 'var(--brand-red)' }} />
                                </div>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 24 }}>{t.progress}%</span>
                              </div>
                            </td>
                            <td>
                              <select
                                value={t.status}
                                onChange={(e) => handleTaskStatusUpdate(t.id, e.target.value as Task['status'])}
                                style={{
                                  background: 'var(--bg-secondary)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-strong)',
                                  borderRadius: 4,
                                  fontSize: 11,
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 5: PENDING LEAVES & ECOSYSTEM OVERVIEW (SIDE-BY-SIDE)
                  ───────────────────────────────────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 24 }}>
                {/* Pending Leave Requests */}
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h2 style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                        Pending Leave Requests
                      </h2>
                      {pendingLeaves.length > 0 && (
                        <span style={{ fontSize: 10, background: 'var(--accent-amber)', color: '#000', borderRadius: 99, padding: '1px 8px', fontWeight: 700 }}>
                          {pendingLeaves.length}
                        </span>
                      )}
                    </div>
                    {loadingLeaves && <Loader2 size={14} className="animate-spin" color="var(--text-muted)" />}
                  </div>

                  {loadingLeaves ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 0', gap: 8, color: 'var(--text-muted)' }}>
                      <Loader2 size={16} className="animate-spin" />
                      <span style={{ fontSize: 13 }}>Loading requests…</span>
                    </div>
                  ) : pendingLeaves.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <CheckCircle2 size={15} color="var(--accent-green)" />
                      <span>All leave requests are up to date.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {pendingLeaves.slice(0, 5).map((r, i) => (
                        <div
                          key={r.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 10,
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                            opacity: processingLeaveId === r.id ? 0.5 : 1,
                            transition: 'opacity 0.2s',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'var(--accent-blue-dim)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                fontWeight: 700,
                                color: 'var(--accent-blue)',
                              }}
                            >
                              {r.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{r.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {r.type} · {r.date} ({r.days})
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}
                              disabled={processingLeaveId === r.id}
                              onClick={() => handleLeaveAction(r.id, 'Approved')}
                            >
                              {processingLeaveId === r.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                              Approve
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}
                              disabled={processingLeaveId === r.id}
                              onClick={() => handleLeaveAction(r.id, 'Rejected')}
                            >
                              {processingLeaveId === r.id ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ecosystem Overview (Original Central Admin Feature Kept) */}
                <div className="card-elevated" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div>
                      <h2 style={{ fontSize: 15, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Ecosystem Overview</h2>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>CMS, EMS, projects, and invoices health</p>
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
                          <td>Tasks & Attendance</td>
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
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  SECTION 6: AUDIT ACTIVITY LOGS (ORIGINAL FEATURE KEPT)
                  ───────────────────────────────────────────────────────────── */}
              <div className="card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 15, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: 4 }}>System Activity Log</h2>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 16 }}>Central integration events & operational audit trail</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {centralLoading ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>Loading activity...</div>
                  ) : activity.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>No recent activity.</div>
                  ) : (
                    activity.map((item: any) => (
                      <div
                        key={item.id || item.title}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}
                      >
                        <span className="status-dot" style={{ background: item.color }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.status}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

        {/* QUICK CREATE TASK MODAL */}
        {showTaskModal && (
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
            onClick={() => setShowTaskModal(false)}
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
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Assign Task to EMS Employee</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    This task will immediately appear on the employee&apos;s EMS portal in real time
                  </p>
                </div>
                <button onClick={() => setShowTaskModal(false)} className="btn btn-ghost" style={{ padding: 6 }}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleQuickTaskCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Task Title <span style={{ color: 'var(--brand-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="input-base"
                    placeholder="e.g. Audit employee attendance discrepancies"
                    value={newTask.title}
                    onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Assign To <span style={{ color: 'var(--brand-red)' }}>*</span>
                  </label>
                  <select
                    required
                    className="input-base"
                    value={newTask.assigneeId}
                    onChange={(e) => {
                      const emp = employeesList.find((em) => em.id === e.target.value);
                      setNewTask((p) => ({
                        ...p,
                        assigneeId: e.target.value,
                        assigneeName: emp?.name || '',
                      }));
                    }}
                  >
                    <option value="">— Select Employee —</option>
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
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
                    placeholder="Instructions and requirements..."
                    value={newTask.desc}
                    onChange={(e) => setNewTask((p) => ({ ...p, desc: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Deadline <span style={{ color: 'var(--brand-red)' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="input-base"
                      value={newTask.deadline}
                      onChange={(e) => setNewTask((p) => ({ ...p, deadline: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Priority
                    </label>
                    <select
                      className="input-base"
                      value={newTask.priority}
                      onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value as any }))}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)} disabled={submittingTask}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submittingTask} style={{ gap: 6 }}>
                    {submittingTask ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {submittingTask ? 'Assigning…' : 'Assign Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </AdminLayout>
  );
}
