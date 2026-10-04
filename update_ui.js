const fs = require('fs');

const dateHelper = `const formatDate = (dateObj: any) => {
  if (!dateObj) return 'N/A';
  if (typeof dateObj === 'string') {
    const d = new Date(dateObj);
    return isNaN(d.getTime()) ? dateObj : d.toLocaleDateString();
  }
  if (dateObj._seconds) return new Date(dateObj._seconds * 1000).toLocaleDateString();
  if (dateObj.seconds) return new Date(dateObj.seconds * 1000).toLocaleDateString();
  return new Date(dateObj).toLocaleDateString();
};`;

const writeClients = () => {
  const code = `'use client';
import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { Edit2, Trash2, Search, X } from 'lucide-react';

${dateHelper}

export default function ClientsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [formData, setFormData] = useState({ companyName: '', email: '', status: 'ACTIVE' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handle = (e: any) => { setIsMobile(e.matches); setSidebarOpen(!e.matches); };
    handle(mq); mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingEntity ? \`/api/clients/\${editingEntity.id}\` : '/api/clients';
      const method = editingEntity ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error(editingEntity ? 'Update failed' : 'Creation failed');
      resetForm();
      await fetchClients();
    } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      const res = await fetchWithAuth(\`/api/clients/\${id}\`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchClients();
    } catch (err: any) { alert(err.message); }
  };

  const startEdit = (client: any) => {
    setEditingEntity(client);
    setFormData({ companyName: client.companyName || client.name || '', email: client.email || '', status: client.status || 'ACTIVE' });
    setShowCreate(true);
  };

  const resetForm = () => {
    setFormData({ companyName: '', email: '', status: 'ACTIVE' });
    setEditingEntity(null); setShowCreate(false);
  };

  const filtered = clients.filter(c => {
    const matchesSearch = (c.companyName || c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || String(c.status || 'ACTIVE').toUpperCase() === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <ProtectedRoute>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        <div style={{ position: isMobile ? 'fixed' : 'relative', zIndex: isMobile ? 50 : 'auto', transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)', transition: 'transform 0.2s', height: '100%' }}>
          <Sidebar open={isMobile ? true : sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main style={{ flex: 1, overflowY: 'auto' }}><div className="page-container">
            <div className="page-header">
              <div><h1 className="page-title">Client Management</h1><p className="page-subtitle">Manage clients</p></div>
              <button className="btn btn-primary" onClick={() => { if(showCreate) resetForm(); else setShowCreate(true); }}>{showCreate ? 'Cancel' : '+ New Client'}</button>
            </div>
            {showCreate && (
              <div className="card" style={{ padding: 24, marginBottom: 24, position: 'relative' }}>
                <h2 style={{ marginBottom: 16 }}>{editingEntity ? 'Edit Client' : 'Create Client'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Company Name</label><input className="input-base" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} required /></div>
                  <div style={{ flex: '1 1 200px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Email</label><input type="email" className="input-base" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required /></div>
                  {editingEntity && (
                    <div style={{ flex: '1 1 150px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Status</label><select className="input-base" style={{ background: 'var(--bg-primary)' }} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></div>
                  )}
                  <button type="submit" className="btn btn-danger" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
                </form>
              </div>
            )}
            <div className="card-elevated" style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, position: 'relative' }}><Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} /><input className="input-base" style={{ paddingLeft: 40 }} placeholder="Search clients..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                <select className="input-base" style={{ width: 180, background: 'var(--bg-primary)' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="ALL">All Statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Created</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c.id}>
                        <td>{c.companyName || c.name || 'Unknown'}</td><td>{c.email}</td><td>{formatDate(c.createdAt)}</td>
                        <td><span className={\`badge \${String(c.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'badge-green' : 'badge-gray'}\`}>{String(c.status || 'ACTIVE').toUpperCase()}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => startEdit(c)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginRight: 12 }}><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: 'var(--brand-red)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div></main>
        </div>
      </div>
    </ProtectedRoute>
  );
}`;
  fs.writeFileSync('src/app/clients/page.tsx', code);
};

const writeEmployees = () => {
  const code = `'use client';
import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { Edit2, Trash2, Search, X } from 'lucide-react';

${dateHelper}

export default function EmployeesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', status: 'ACTIVE' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handle = (e: any) => { setIsMobile(e.matches); setSidebarOpen(!e.matches); };
    handle(mq); mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/employees');
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingEntity ? \`/api/employees/\${editingEntity.id}\` : '/api/employees';
      const method = editingEntity ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error(editingEntity ? 'Update failed' : 'Creation failed');
      resetForm();
      await fetchEmployees();
    } catch (err: any) { alert(err.message); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      const res = await fetchWithAuth(\`/api/employees/\${id}\`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchEmployees();
    } catch (err: any) { alert(err.message); }
  };

  const startEdit = (emp: any) => {
    setEditingEntity(emp);
    setFormData({ firstName: emp.firstName || '', lastName: emp.lastName || '', email: emp.email || '', status: emp.status || 'ACTIVE' });
    setShowCreate(true);
  };

  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', email: '', status: 'ACTIVE' });
    setEditingEntity(null); setShowCreate(false);
  };

  const filtered = employees.filter(e => {
    const matchesSearch = ((e.firstName || '') + ' ' + (e.lastName || '') + ' ' + (e.name || '')).toLowerCase().includes(searchTerm.toLowerCase()) || (e.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || String(e.status || 'ACTIVE').toUpperCase() === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <ProtectedRoute>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        <div style={{ position: isMobile ? 'fixed' : 'relative', zIndex: isMobile ? 50 : 'auto', transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)', transition: 'transform 0.2s', height: '100%' }}>
          <Sidebar open={isMobile ? true : sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main style={{ flex: 1, overflowY: 'auto' }}><div className="page-container">
            <div className="page-header">
              <div><h1 className="page-title">Employee Management</h1><p className="page-subtitle">Manage EMS employees</p></div>
              <button className="btn btn-primary" onClick={() => { if(showCreate) resetForm(); else setShowCreate(true); }}>{showCreate ? 'Cancel' : '+ New Employee'}</button>
            </div>
            {showCreate && (
              <div className="card" style={{ padding: 24, marginBottom: 24, position: 'relative' }}>
                <h2 style={{ marginBottom: 16 }}>{editingEntity ? 'Edit Employee' : 'Create Employee'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 150px' }}><label className="block text-xs font-bold text-gray-500 mb-1">First Name</label><input className="input-base" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required /></div>
                  <div style={{ flex: '1 1 150px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Last Name</label><input className="input-base" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} /></div>
                  <div style={{ flex: '1 1 200px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Email</label><input type="email" className="input-base" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required /></div>
                  {editingEntity && (
                    <div style={{ flex: '1 1 150px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Status</label><select className="input-base" style={{ background: 'var(--bg-primary)' }} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="ACTIVE">ACTIVE</option><option value="ARCHIVED">ARCHIVED</option></select></div>
                  )}
                  <button type="submit" className="btn btn-danger" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
                </form>
              </div>
            )}
            <div className="card-elevated" style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, position: 'relative' }}><Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} /><input className="input-base" style={{ paddingLeft: 40 }} placeholder="Search employees..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                <select className="input-base" style={{ width: 180, background: 'var(--bg-primary)' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="ALL">All Statuses</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select>
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map(e => (
                      <tr key={e.id}>
                        <td>{e.firstName ? \`\${e.firstName} \${e.lastName || ''}\`.trim() : e.name || 'Unknown'}</td><td>{e.email}</td><td>{e.joiningDate ? formatDate(e.joiningDate) : formatDate(e.createdAt)}</td>
                        <td><span className={\`badge \${String(e.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'badge-green' : 'badge-gray'}\`}>{String(e.status || 'ACTIVE').toUpperCase()}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => startEdit(e)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginRight: 12 }}><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: 'none', color: 'var(--brand-red)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div></main>
        </div>
      </div>
    </ProtectedRoute>
  );
}`;
  fs.writeFileSync('src/app/employees/page.tsx', code);
};

writeClients();
writeEmployees();
console.log('UI updated');
