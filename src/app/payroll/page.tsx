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
  updateDoc,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import {
  Coins,
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Plus,
  Loader2,
  X,
  CreditCard,
  Building,
  TrendingUp,
} from 'lucide-react';

type PayrollRecord = {
  id: string;
  employeeId: string;
  name: string;
  dept: string;
  month: string;
  salary: number;
  basic: number;
  allowances: number;
  bonus: number;
  pf: number;
  tax: number;
  deductions: number;
  net: number;
  status: 'Paid' | 'Pending';
  paidAt?: any;
  createdAt?: any;
};

type Employee = {
  id: string;
  uid?: string;
  employeeId: string;
  name: string;
  department: string;
  salary?: number;
  status?: string;
};

export default function PayrollPage() {
  const { user, userData } = useAuth();

  const now = new Date();
  const currentMonthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const [selectedMonth, setSelectedMonth] = useState(currentMonthLabel);

  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Paid' | 'Pending'>('ALL');
  const [generating, setGenerating] = useState(false);

  // Payslip Modal
  const [viewingSlip, setViewingSlip] = useState<PayrollRecord | null>(null);

  // Real-time Employees Listener
  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Employee[] = snap.docs
          .map((d) => {
            const data = d.data();
            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || d.id;
            return {
              id: d.id,
              uid: data.uid || d.id,
              employeeId: data.employeeId || d.id.slice(0, 6).toUpperCase(),
              name: fullName,
              department: data.department || 'Other',
              salary: Number(data.salary) || 50000,
              status: data.status || 'Active',
            };
          })
          .filter((e) => e.status !== 'Archived');
        setEmployees(list);
      },
      (err) => console.error('Employees error in payroll:', err)
    );
    return () => unsub();
  }, []);

  // Real-time Payroll Listener for selected month
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'payroll'), where('month', '==', selectedMonth));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: PayrollRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            employeeId: data.employeeId || '',
            name: data.employeeName || data.name || 'Employee',
            dept: data.department || data.dept || 'General',
            month: data.month || selectedMonth,
            salary: data.salary || 0,
            basic: data.basic || 0,
            allowances: data.allowances || 0,
            bonus: data.bonus || 0,
            pf: data.pf || 0,
            tax: data.tax || 0,
            deductions: data.deductions || 0,
            net: data.net || 0,
            status: data.status || 'Pending',
            paidAt: data.paidAt,
            createdAt: data.createdAt,
          };
        });
        setPayrollRecords(rows);
        setLoading(false);
      },
      (err) => {
        console.error('Payroll fetch error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [selectedMonth]);

  // Generate / Recalculate Payroll for all employees for the selected month
  const handleGeneratePayroll = async () => {
    if (employees.length === 0) {
      toast.error('No active employees found to process');
      return;
    }

    setGenerating(true);
    try {
      const promises = employees.map(async (emp) => {
        const docId = `${emp.employeeId}_${selectedMonth.replace(/\s+/g, '_')}`;
        const baseSalary = emp.salary && emp.salary > 0 ? emp.salary : 50000;
        const basic = Math.round(baseSalary * 0.5);
        const allowances = Math.round(baseSalary * 0.3);
        const bonus = 0;
        const pf = Math.round(basic * 0.12);
        const tax = Math.round(baseSalary * 0.05);
        const deductions = pf + tax;
        const net = basic + allowances + bonus - deductions;

        const payload = {
          employeeId: emp.employeeId,
          employeeName: emp.name,
          name: emp.name,
          department: emp.department,
          dept: emp.department,
          month: selectedMonth,
          salary: baseSalary,
          basic,
          allowances,
          bonus,
          pf,
          tax,
          deductions,
          net,
          status: 'Pending',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        };

        return setDoc(doc(db, 'payroll', docId), payload, { merge: true });
      });

      await Promise.all(promises);

      await addDoc(collection(db, 'auditLogs'), {
        actorId: user?.uid || 'admin',
        actorRole: userData?.role || 'SUPER_ADMIN',
        action: 'PAYROLL_GENERATED',
        entityType: 'PAYROLL',
        timestamp: new Date().toISOString(),
        result: 'SUCCESS',
        details: { month: selectedMonth, employeesProcessed: employees.length },
      }).catch(() => {});

      toast.success(`Payroll processed for ${employees.length} employees (${selectedMonth})!`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  // Mark Payroll as Paid
  const handleMarkAsPaid = async (id: string, empName: string) => {
    try {
      await updateDoc(doc(db, 'payroll', id), {
        status: 'Paid',
        paidAt: serverTimestamp(),
        paidBy: userData?.name || user?.displayName || 'Central Admin',
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'auditLogs'), {
        actorId: user?.uid || 'admin',
        actorRole: userData?.role || 'SUPER_ADMIN',
        action: 'PAYROLL_PAID',
        entityType: 'PAYROLL',
        entityId: id,
        timestamp: new Date().toISOString(),
        result: 'SUCCESS',
        details: { employee: empName, month: selectedMonth },
      }).catch(() => {});

      toast.success(`Marked as Paid for ${empName}!`);
    } catch {
      toast.error('Failed to update payment status');
    }
  };

  // Filtered rows
  const filtered = useMemo(() => {
    return payrollRecords.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.dept.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payrollRecords, searchTerm, statusFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalDisbursed = payrollRecords.reduce((sum, r) => sum + (r.status === 'Paid' ? r.net : 0), 0);
    const totalPending = payrollRecords.reduce((sum, r) => sum + (r.status === 'Pending' ? r.net : 0), 0);
    const totalGross = payrollRecords.reduce((sum, r) => sum + (r.basic + r.allowances + r.bonus), 0);
    const totalDeductions = payrollRecords.reduce((sum, r) => sum + r.deductions, 0);

    return { totalDisbursed, totalPending, totalGross, totalDeductions };
  }, [payrollRecords]);

  // Print Payslip
  const handlePrintSlip = (entry: PayrollRecord) => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Payslip - ${entry.name} - ${entry.month}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; max-width: 650px; margin: 40px auto; color: #111; line-height: 1.5; padding: 20px; }
    .header { border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 24px; font-weight: 800; letter-spacing: -0.03em; }
    .subtitle { color: #555; font-size: 13px; margin-top: 4px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
    .section-title { font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #777; margin: 20px 0 6px; }
    .net-box { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #0a0a0a; color: #fff; border-radius: 4px; margin-top: 24px; }
    .net-amount { font-size: 20px; font-weight: 700; color: #22c55e; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">MAKEWITHUS</div>
      <div class="subtitle">Official Salary Statement &bull; ${entry.month}</div>
    </div>
    <div style="text-align: right; font-size: 12px; color: #555;">
      <div>Status: <strong>${entry.status}</strong></div>
      <div>ID: ${entry.employeeId}</div>
    </div>
  </div>

  <div style="margin-bottom: 20px; font-size: 13px;">
    <strong>Employee Name:</strong> ${entry.name}<br />
    <strong>Department:</strong> ${entry.dept}<br />
  </div>

  <div class="section-title">Earnings Breakdown</div>
  <div class="row"><span>Basic Salary</span><span>₹${entry.basic.toLocaleString()}</span></div>
  <div class="row"><span>Allowances</span><span>₹${entry.allowances.toLocaleString()}</span></div>
  <div class="row"><span>Bonus / Incentive</span><span>₹${entry.bonus.toLocaleString()}</span></div>
  <div class="row" style="font-weight: 700;"><span>Gross Salary</span><span>₹${(entry.basic + entry.allowances + entry.bonus).toLocaleString()}</span></div>

  <div class="section-title">Deductions</div>
  <div class="row"><span>Provident Fund (PF)</span><span style="color: #ef4444">- ₹${entry.pf.toLocaleString()}</span></div>
  <div class="row"><span>Income Tax (TDS)</span><span style="color: #ef4444">- ₹${entry.tax.toLocaleString()}</span></div>
  <div class="row" style="font-weight: 700;"><span>Total Deductions</span><span style="color: #ef4444">- ₹${entry.deductions.toLocaleString()}</span></div>

  <div class="net-box">
    <span>Net Take-Home Salary</span>
    <span class="net-amount">₹${entry.net.toLocaleString()}</span>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      setTimeout(() => {
        win.print();
        URL.revokeObjectURL(url);
      }, 500);
    }
  };

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ].map((m) => `${m} ${now.getFullYear()}`);

  return (
    <AdminLayout>
      <div className="page-container" style={{ paddingBottom: 60 }}>
              {/* Header */}
              <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                  <h1 className="page-title">Payroll Management</h1>
                  <p className="page-subtitle">Central disbursement, automated generation & payslip distribution</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <select
                    className="input-base"
                    style={{ padding: '7px 12px', fontSize: 13, width: 'auto' }}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    {monthsList.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleGeneratePayroll}
                    disabled={generating}
                    className="btn btn-primary"
                    style={{ gap: 8, padding: '8px 16px', fontSize: 13 }}
                  >
                    {generating ? <Loader2 size={15} className="animate-spin" /> : <Coins size={15} />}
                    {generating ? 'Processing…' : 'Process Monthly Payroll'}
                  </button>
                </div>
              </div>

              {/* Summary Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Disbursed (Paid)', value: `₹${metrics.totalDisbursed.toLocaleString()}`, color: '#22c55e', icon: CheckCircle2 },
                  { label: 'Pending Payout', value: `₹${metrics.totalPending.toLocaleString()}`, color: '#f59e0b', icon: Clock },
                  { label: 'Total Gross Salary', value: `₹${metrics.totalGross.toLocaleString()}`, color: 'var(--text-primary)', icon: TrendingUp },
                  { label: 'Total Deductions', value: `₹${metrics.totalDeductions.toLocaleString()}`, color: '#ff3131', icon: CreditCard },
                ].map((m) => (
                  <div key={m.label} className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: m.color, marginTop: 4 }}>{m.value}</div>
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: 6, background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <m.icon size={17} color={m.color} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
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

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status:</span>
                  <select
                    className="input-base"
                    style={{ padding: '6px 12px', fontSize: 12, width: 'auto' }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <option value="ALL">All Records</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              {/* Payroll Records Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading real-time payroll records...</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Coins size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No payroll records for {selectedMonth}</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Click &quot;Process Monthly Payroll&quot; above to automatically calculate payroll for this month.</div>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Department</th>
                          <th>Basic</th>
                          <th>Allowances</th>
                          <th>PF / Tax</th>
                          <th>Net Salary</th>
                          <th>Status (Syncs Live)</th>
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
                                  {r.name[0] || 'E'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{r.name}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.employeeId}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-gray" style={{ fontSize: 11 }}>
                                {r.dept}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>₹{r.basic.toLocaleString()}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>₹{r.allowances.toLocaleString()}</td>
                            <td style={{ fontSize: 12, color: '#ff3131' }}>-₹{r.deductions.toLocaleString()}</td>
                            <td style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>₹{r.net.toLocaleString()}</td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: r.status === 'Paid' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                                  color: r.status === 'Paid' ? '#22c55e' : '#f59e0b',
                                  fontSize: 11,
                                }}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 6 }}>
                                {r.status === 'Pending' && (
                                  <button
                                    onClick={() => handleMarkAsPaid(r.id, r.name)}
                                    className="btn btn-primary"
                                    style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}
                                  >
                                    <CheckCircle2 size={11} /> Mark Paid
                                  </button>
                                )}
                                <button
                                  onClick={() => handlePrintSlip(r)}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}
                                  title="Print / Download Payslip"
                                >
                                  <Printer size={11} /> Payslip
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
    </AdminLayout>
  );
}
