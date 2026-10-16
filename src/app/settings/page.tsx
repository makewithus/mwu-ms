'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { toast } from '@/components/ui/Toast';
import { db } from '@/lib/firebase/client';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Building2,
  Shield,
  CalendarDays,
  DollarSign,
  Save,
  Check,
  Plus,
  Trash2,
  Loader2,
  Tags,
  Sliders,
  Sparkles,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type CompanyData = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

const COMPANY_DEFAULTS: CompanyData = {
  name: 'makewithus Pvt Ltd',
  email: 'contact@makewithus.in',
  phone: '+91 62387 19566',
  address: 'India',
};

const SEED_DEPARTMENTS = [
  'Developer',
  'Designer',
  'Project Manager',
  'Super Admin',
  'AI',
  'Marketing',
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'company' | 'departments' | 'leave' | 'payroll' | 'roles'>('company');

  // Company state
  const [company, setCompany] = useState<CompanyData>(COMPANY_DEFAULTS);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);

  // Departments state
  const [departments, setDepartments] = useState<string[]>(SEED_DEPARTMENTS);
  const [newDept, setNewDept] = useState('');
  const [deptSaving, setDeptSaving] = useState(false);

  // Leave Policy state
  const [leavePolicy, setLeavePolicy] = useState({
    casual: '12',
    medical: '10',
    paid: '15',
    emergency: '5',
  });
  const [leaveSaving, setLeaveSaving] = useState(false);

  // Payroll Rules state
  const [payrollRules, setPayrollRules] = useState({
    pf: '12',
    pt: '200',
    tds: '10',
    salaryDay: '1',
  });
  const [payrollSaving, setPayrollSaving] = useState(false);

  // Load company settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'company'), (snap) => {
      if (snap.exists()) {
        setCompany({ ...COMPANY_DEFAULTS, ...snap.data() } as CompanyData);
      }
      setCompanyLoading(false);
    }, () => {
      setCompanyLoading(false);
    });
    return () => unsub();
  }, []);

  // Load department categories
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'categories'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (Array.isArray(d.departments) && d.departments.length > 0) {
          setDepartments(d.departments);
        } else {
          setDepartments(SEED_DEPARTMENTS);
        }
      } else {
        setDoc(doc(db, 'settings', 'categories'), { departments: SEED_DEPARTMENTS }).catch(() => {});
        setDepartments(SEED_DEPARTMENTS);
      }
    });
    return () => unsub();
  }, []);

  // Load leave policy
  useEffect(() => {
    getDoc(doc(db, 'settings', 'leavePolicy')).then((snap) => {
      if (snap.exists()) {
        setLeavePolicy((prev) => ({ ...prev, ...snap.data() }));
      }
    }).catch(() => {});
  }, []);

  // Load payroll rules
  useEffect(() => {
    getDoc(doc(db, 'settings', 'payrollRules')).then((snap) => {
      if (snap.exists()) {
        setPayrollRules((prev) => ({ ...prev, ...snap.data() }));
      }
    }).catch(() => {});
  }, []);

  // Save company
  const handleSaveCompany = async () => {
    setCompanySaving(true);
    try {
      await setDoc(doc(db, 'settings', 'company'), {
        ...company,
        updatedAt: serverTimestamp(),
      });
      toast.success('Company details saved to database!');
    } catch (err: any) {
      toast.error('Failed to save company settings: ' + err.message);
    } finally {
      setCompanySaving(false);
    }
  };

  // Add department
  const handleAddDept = async () => {
    const trimmed = newDept.trim();
    if (!trimmed) return;
    if (departments.includes(trimmed)) {
      toast.error(`"${trimmed}" department already exists`);
      return;
    }
    setDeptSaving(true);
    try {
      const next = [...departments, trimmed];
      await setDoc(doc(db, 'settings', 'categories'), { departments: next });
      toast.success(`Department "${trimmed}" added!`);
      setNewDept('');
    } catch (err: any) {
      toast.error('Failed to add department: ' + err.message);
    } finally {
      setDeptSaving(false);
    }
  };

  // Remove department
  const handleRemoveDept = async (name: string) => {
    try {
      const next = departments.filter((d) => d !== name);
      await setDoc(doc(db, 'settings', 'categories'), { departments: next });
      toast.success(`Department "${name}" removed!`);
    } catch (err: any) {
      toast.error('Failed to remove department: ' + err.message);
    }
  };

  // Save leave policy
  const handleSaveLeave = async () => {
    setLeaveSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'leavePolicy'), {
        ...leavePolicy,
        updatedAt: serverTimestamp(),
      });
      toast.success('Leave policies updated successfully!');
    } catch (err: any) {
      toast.error('Failed to save leave policies: ' + err.message);
    } finally {
      setLeaveSaving(false);
    }
  };

  // Save payroll rules
  const handleSavePayroll = async () => {
    setPayrollSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'payrollRules'), {
        ...payrollRules,
        updatedAt: serverTimestamp(),
      });
      toast.success('Payroll configuration rules updated!');
    } catch (err: any) {
      toast.error('Failed to save payroll rules: ' + err.message);
    } finally {
      setPayrollSaving(false);
    }
  };

  const tabs = [
    { id: 'company' as const, label: 'Company Settings', icon: Building2 },
    { id: 'departments' as const, label: 'Department Categories', icon: Tags },
    { id: 'leave' as const, label: 'Leave Policy', icon: CalendarDays },
    { id: 'payroll' as const, label: 'Payroll Rules', icon: DollarSign },
    { id: 'roles' as const, label: 'Access & Roles', icon: Shield },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: 32 }}>
        {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', margin: 0, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                  SYSTEM &amp; EMS SETTINGS
                </h1>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,49,49,0.15)', color: 'var(--brand-red)' }}>
                  ORGANIZATION
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                Configure global company policies, department categories, leave rules, and operational configurations
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, alignItems: 'flex-start' }}>
              {/* Tab Navigation */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: isActive ? 'var(--brand-red)' : 'transparent',
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                        fontSize: 12.5,
                        fontWeight: isActive ? 700 : 500,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                    >
                      <Icon size={15} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Box */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 28,
                }}
              >
                {/* ── 1. Company Settings ── */}
                {activeTab === 'company' && (
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Company Profile &amp; Contact Details
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>
                      These details appear on generated documents, invoices, payslips, and system headers.
                    </p>

                    {companyLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                        <Loader2 size={16} className="animate-spin" /> Loading company information…
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                              Company Legal Name
                            </label>
                            <input
                              type="text"
                              value={company.name}
                              onChange={(e) => setCompany({ ...company, name: e.target.value })}
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                              Corporate Email
                            </label>
                            <input
                              type="email"
                              value={company.email}
                              onChange={(e) => setCompany({ ...company, email: e.target.value })}
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                              Headquarters Phone
                            </label>
                            <input
                              type="tel"
                              value={company.phone}
                              onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                              style={inputStyle}
                            />
                          </div>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                            Corporate Registered Address
                          </label>
                          <textarea
                            rows={3}
                            value={company.address}
                            onChange={(e) => setCompany({ ...company, address: e.target.value })}
                            style={{ ...inputStyle, resize: 'none' }}
                          />
                        </div>

                        <button
                          onClick={handleSaveCompany}
                          disabled={companySaving}
                          style={primaryBtnStyle}
                        >
                          {companySaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          {companySaving ? 'Saving…' : 'Save Company Details'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* ── 2. Departments ── */}
                {activeTab === 'departments' && (
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Department Categories
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>
                      Departments are synced directly with Firestore <code style={{ color: 'var(--brand-red)' }}>settings/categories</code> and populate all employee, task, notice, and report dropdowns.
                    </p>

                    <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                      <input
                        type="text"
                        placeholder="Add new department (e.g. Quality Assurance, Cloud Engineering)…"
                        value={newDept}
                        onChange={(e) => setNewDept(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDept()}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        onClick={handleAddDept}
                        disabled={deptSaving || !newDept.trim()}
                        style={primaryBtnStyle}
                      >
                        <Plus size={14} /> Add Category
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {departments.map((d) => (
                        <div
                          key={d}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'var(--bg-primary)',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d}</span>
                          <button
                            onClick={() => handleRemoveDept(d)}
                            title={`Remove ${d}`}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--brand-red)',
                              cursor: 'pointer',
                              padding: 4,
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── 3. Leave Policy ── */}
                {activeTab === 'leave' && (
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Leave Policy &amp; Yearly Quotas
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>
                      Define annual leave allowances for employees across the organization.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                          Casual Leaves (Yearly)
                        </label>
                        <input
                          type="number"
                          value={leavePolicy.casual}
                          onChange={(e) => setLeavePolicy({ ...leavePolicy, casual: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                          Medical Leaves (Yearly)
                        </label>
                        <input
                          type="number"
                          value={leavePolicy.medical}
                          onChange={(e) => setLeavePolicy({ ...leavePolicy, medical: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                          Paid Leaves (Yearly)
                        </label>
                        <input
                          type="number"
                          value={leavePolicy.paid}
                          onChange={(e) => setLeavePolicy({ ...leavePolicy, paid: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                          Emergency Leaves
                        </label>
                        <input
                          type="number"
                          value={leavePolicy.emergency}
                          onChange={(e) => setLeavePolicy({ ...leavePolicy, emergency: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveLeave}
                      disabled={leaveSaving}
                      style={primaryBtnStyle}
                    >
                      {leaveSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {leaveSaving ? 'Updating…' : 'Save Leave Policy'}
                    </button>
                  </div>
                )}

                {/* ── 4. Payroll Rules ── */}
                {activeTab === 'payroll' && (
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Payroll Calculation &amp; Deduction Rules
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>
                      Set statutory rates and payout schedules for automated monthly payroll batch generation.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                          PF Contribution (%)
                        </label>
                        <input
                          type="number"
                          value={payrollRules.pf}
                          onChange={(e) => setPayrollRules({ ...payrollRules, pf: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                          Professional Tax (₹/mo)
                        </label>
                        <input
                          type="number"
                          value={payrollRules.pt}
                          onChange={(e) => setPayrollRules({ ...payrollRules, pt: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                          TDS Rate (%)
                        </label>
                        <input
                          type="number"
                          value={payrollRules.tds}
                          onChange={(e) => setPayrollRules({ ...payrollRules, tds: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                          Salary Day of Month
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={payrollRules.salaryDay}
                          onChange={(e) => setPayrollRules({ ...payrollRules, salaryDay: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSavePayroll}
                      disabled={payrollSaving}
                      style={primaryBtnStyle}
                    >
                      {payrollSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {payrollSaving ? 'Saving…' : 'Save Payroll Rules'}
                    </button>
                  </div>
                )}

                {/* ── 5. Roles & Access Matrix ── */}
                {activeTab === 'roles' && (
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Role Architecture &amp; System Permissions
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>
                      Permissions across Central Admin and EMS are managed through Role-Based Access Control (RBAC).
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        {
                          role: 'SUPER_ADMIN',
                          title: 'Super Administrator',
                          desc: 'Unrestricted control over all systems, billing, client projects, employee payroll, attendance overrides, and system users.',
                          color: 'var(--brand-red)',
                        },
                        {
                          role: 'ADMIN / HR_ADMIN',
                          title: 'Admin / HR Executive',
                          desc: 'Full operational access to employee records, task assignment, leave approvals, monthly payroll runs, documents, and company notices.',
                          color: '#3b82f6',
                        },
                        {
                          role: 'MANAGER',
                          title: 'Engineering / Operations Manager',
                          desc: 'Task delegation, project tracking, attendance monitoring, and performance report views.',
                          color: '#f59e0b',
                        },
                        {
                          role: 'EMPLOYEE',
                          title: 'Employee / User Self-Service',
                          desc: 'Self-service dashboard, punch clock attendance, personal leave requests, view assigned tasks, download payslips, access company notices.',
                          color: '#22c55e',
                        },
                      ].map((r) => (
                        <div
                          key={r.role}
                          style={{
                            padding: '16px 20px',
                            background: 'var(--bg-primary)',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            borderLeft: `4px solid ${r.color}`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{r.title}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${r.color}20`, color: r.color }}>
                              {r.role}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                            {r.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
    </AdminLayout>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  fontSize: 12.5,
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 20px',
  background: 'var(--brand-red)',
  border: 'none',
  borderRadius: 6,
  color: '#fff',
  fontSize: 12.5,
  fontWeight: 700,
  cursor: 'pointer',
};
