'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth/auth-context';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  DollarSign,
  FolderOpen,
  ListTodo,
  TrendingUp,
  PieChart as PieIcon,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const REPORT_TABS = [
  { id: 'attendance', label: 'Attendance Report', icon: Calendar, color: 'var(--brand-red)' },
  { id: 'payroll', label: 'Payroll Report', icon: DollarSign, color: '#22c55e' },
  { id: 'tasks', label: 'Tasks Report', icon: ListTodo, color: '#3b82f6' },
  { id: 'employees', label: 'Employee Headcount', icon: Users, color: '#a855f7' },
  { id: 'leaves', label: 'Leaves Report', icon: Calendar, color: '#f59e0b' },
];

const tooltipStyle = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  fontSize: 12,
  color: 'var(--text-primary)',
};

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeReport, setActiveReport] = useState('attendance');

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Data states
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listeners across all operational collections
  useEffect(() => {
    const unsubAtt = onSnapshot(collection(db, 'attendance'), (s) => setAttendanceRecords(s.docs.map((d) => d.data())), () => {});
    const unsubPay = onSnapshot(collection(db, 'payroll'), (s) => setPayrollRecords(s.docs.map((d) => d.data())), () => {});
    const unsubTask = onSnapshot(collection(db, 'tasks'), (s) => setTasks(s.docs.map((d) => d.data())), () => {});
    const unsubEmp = onSnapshot(collection(db, 'employees'), (s) => setEmployees(s.docs.map((d) => d.data())), () => {});
    const unsubLeave = onSnapshot(collection(db, 'leaveRequests'), (s) => {
      setLeaveRequests(s.docs.map((d) => d.data()));
      setLoading(false);
    }, () => setLoading(false));

    return () => {
      unsubAtt();
      unsubPay();
      unsubTask();
      unsubEmp();
      unsubLeave();
    };
  }, []);

  // Monthly Attendance Trend
  const attendanceMonthlyTrend = useMemo(() => {
    const map: Record<string, { present: number; absent: number; late: number }> = {};
    attendanceRecords.forEach((d) => {
      const date = d.date;
      if (!date) return;
      const key = new Date(date).toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { present: 0, absent: 0, late: 0 };
      if (d.status === 'Present') map[key].present++;
      else if (d.status === 'Late') {
        map[key].present++;
        map[key].late++;
      } else if (d.status === 'Absent') map[key].absent++;
    });
    return Object.entries(map).slice(-6).map(([month, v]) => ({ month, ...v }));
  }, [attendanceRecords]);

  // Monthly Payroll Trend
  const payrollMonthlyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    payrollRecords.forEach((p) => {
      const m = p.month || 'Other';
      map[m] = (map[m] || 0) + (p.net || 0);
    });
    return Object.entries(map).slice(-6).map(([month, total]) => ({ month, total }));
  }, [payrollRecords]);

  // Tasks Status Distribution
  const tasksDistribution = useMemo(() => {
    const map: Record<string, number> = { Pending: 0, 'In Progress': 0, Review: 0, Completed: 0 };
    tasks.forEach((t) => {
      const s = t.status || 'Pending';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [tasks]);

  // Export current report to CSV
  const handleExportReport = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = `Report_${activeReport}_${dateTo}.csv`;

    if (activeReport === 'attendance') {
      headers = ['Date', 'Employee ID', 'Employee Name', 'Department', 'Status', 'Clock In', 'Clock Out'];
      rows = attendanceRecords.map((r) => [r.date, r.employeeId, r.employeeName, r.department, r.status, r.clockIn, r.clockOut]);
    } else if (activeReport === 'payroll') {
      headers = ['Month', 'Employee ID', 'Employee Name', 'Department', 'Basic', 'Allowances', 'Deductions', 'Net Salary', 'Status'];
      rows = payrollRecords.map((r) => [r.month, r.employeeId, r.name, r.dept, r.basic, r.allowances, r.deductions, r.net, r.status]);
    } else if (activeReport === 'tasks') {
      headers = ['Task Title', 'Assignee', 'Priority', 'Deadline', 'Status', 'Progress (%)'];
      rows = tasks.map((r) => [r.title, r.assigneeName, r.priority, r.deadline, r.status, r.progress]);
    } else if (activeReport === 'leaves') {
      headers = ['Employee Name', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'];
      rows = leaveRequests.map((r) => [r.employeeName, r.leaveType, r.startDate, r.endDate, r.days, r.status, `"${(r.reason || '').replace(/"/g, '""')}"`]);
    } else {
      headers = ['Employee ID', 'First Name', 'Last Name', 'Email', 'Department', 'Designation', 'Status'];
      rows = employees.map((r) => [r.employeeId, r.firstName, r.lastName, r.email, r.department, r.designation, r.status]);
    }

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encoded = encodeURI(csv);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`${activeReport.toUpperCase()} report exported!`);
  };

  return (
    <AdminLayout>
      <div className="page-container" style={{ paddingBottom: 60 }}>
              {/* Header */}
              <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                  <h1 className="page-title">Operational Reports & Analytics</h1>
                  <p className="page-subtitle">Real-time business intelligence across workforce, payroll, and tasks</p>
                </div>
                <button
                  onClick={handleExportReport}
                  className="btn btn-primary"
                  style={{ gap: 8, padding: '8px 16px', fontSize: 13 }}
                >
                  <Download size={15} /> Export Report CSV
                </button>
              </div>

              {/* Report Tab Selector */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 20 }}>
                {REPORT_TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveReport(t.id)}
                    className={`btn ${activeReport === t.id ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '8px 16px', fontSize: 13, gap: 8, whiteSpace: 'nowrap' }}
                  >
                    <t.icon size={15} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Dynamic Chart Display based on selected report */}
              <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                      {activeReport.toUpperCase()} TREND
                    </h2>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Historical monthly trajectory aggregated from real-time database
                    </p>
                  </div>
                  <FileSpreadsheet size={18} color="var(--brand-red)" />
                </div>

                {!mounted || loading ? (
                  <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                ) : activeReport === 'attendance' ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={attendanceMonthlyTrend} barSize={14} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--bg-secondary)' }} />
                      <Bar dataKey="present" fill="var(--text-primary)" name="Present" />
                      <Bar dataKey="absent" fill="var(--brand-red)" name="Absent" />
                      <Bar dataKey="late" fill="var(--accent-amber)" name="Late" />
                      <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 10 }} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : activeReport === 'payroll' ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={payrollMonthlyTrend}>
                      <defs>
                        <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="total" stroke="#22c55e" fill="url(#payGrad)" strokeWidth={2} name="Net Disbursed (₹)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={tasksDistribution} barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="status" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--bg-secondary)' }} />
                      <Bar dataKey="count" fill="var(--brand-red)" name="Tasks Count" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </div>
          </div>
    </AdminLayout>
  );
}
