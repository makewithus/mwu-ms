'use client';
import { useEffect, useState } from 'react';
import { apiGet, fetchWithAuth, getCachedApiData, invalidateApiCache } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { toast } from '@/components/ui/Toast';
import { confirmAction } from '@/components/ui/ConfirmModal';
import { Edit2, Trash2, Search, X, Printer, FileText } from 'lucide-react';

const formatDate = (dateObj: any) => {
  if (!dateObj) return 'N/A';
  if (typeof dateObj === 'string') {
    const d = new Date(dateObj);
    return isNaN(d.getTime()) ? dateObj : d.toLocaleDateString();
  }
  if (dateObj._seconds) return new Date(dateObj._seconds * 1000).toLocaleDateString();
  if (dateObj.seconds) return new Date(dateObj.seconds * 1000).toLocaleDateString();
  return new Date(dateObj).toLocaleDateString();
};

export default function InvoicesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [invoices, setInvoices] = useState<any[]>(() => getCachedApiData<{ invoices?: any[] }>('/api/invoices')?.invoices || []);
  const [clients, setClients] = useState<any[]>(() => getCachedApiData<{ clients?: any[] }>('/api/clients')?.clients || []);
  const [projects, setProjects] = useState<any[]>(() => getCachedApiData<{ projects?: any[] }>('/api/projects')?.projects || []);
  const [loading, setLoading] = useState(() => !getCachedApiData('/api/invoices'));
  
  const [showCreate, setShowCreate] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [formData, setFormData] = useState({ amount: '', status: 'UNPAID', clientId: '', projectId: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handle = (e: any) => { setIsMobile(e.matches); setSidebarOpen(!e.matches); };
    handle(mq); mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  const fetchAll = async (force = false) => {
    if (invoices.length === 0) setLoading(true);
    try {
      const [invData, cliData, projData] = await Promise.all([
        apiGet<{ invoices?: any[] }>('/api/invoices', { force }),
        apiGet<{ clients?: any[] }>('/api/clients', { force }),
        apiGet<{ projects?: any[] }>('/api/projects', { force })
      ]);
      setInvoices(invData.invoices || []);
      setClients(cliData.clients || []);
      setProjects(projData.projects || []);
    } catch (err: any) { toast.error(err.message || 'Operation failed'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.clientId || !formData.projectId) return;
    setIsSubmitting(true);
    try {
      const url = editingEntity ? `/api/invoices/${editingEntity.id}` : '/api/invoices';
      const method = editingEntity ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || (editingEntity ? 'Update failed' : 'Creation failed'));
      invalidateApiCache(['/api/invoices', '/api/dashboard/stats', '/api/integrations/events']);
      setInvoices(prev => editingEntity
        ? prev.map(invoice => invoice.id === editingEntity.id ? { ...invoice, ...formData, updatedAt: new Date().toISOString() } : invoice)
        : [{ ...saved, ...formData }, ...prev]
      );
      resetForm();
      void fetchAll(true);
      toast.success(editingEntity ? 'Invoice updated successfully.' : 'Invoice created successfully.');
    } catch (err: any) { toast.error(err.message || 'Failed to save invoice. Please try again.'); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({
      title: 'Delete Invoice',
      message: 'This will permanently remove this invoice record. This action cannot be undone.',
      confirmLabel: 'Yes, Delete Invoice',
      type: 'danger',
    }))) return;
    try {
      const res = await fetchWithAuth(`/api/invoices/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      invalidateApiCache(['/api/invoices', '/api/dashboard/stats']);
      setInvoices(prev => prev.filter(invoice => invoice.id !== id));
      void fetchAll(true);
      toast.success('Invoice deleted successfully.');
    } catch (err: any) { toast.error(err.message || 'Failed to delete invoice. Please try again.'); }
  };

  const startEdit = (inv: any) => {
    setEditingEntity(inv);
    setFormData({ amount: inv.amount || '', status: inv.status || 'UNPAID', clientId: inv.clientId || '', projectId: inv.projectId || '' });
    setShowCreate(true);
  };

  const resetForm = () => {
    setFormData({ amount: '', status: 'UNPAID', clientId: '', projectId: '' });
    setEditingEntity(null); setShowCreate(false);
  };

  const filtered = invoices.filter(i => {
    const matchesSearch = (i.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || String(i.status || 'UNPAID').toUpperCase() === filterStatus;
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
              <div><h1 className="page-title">Invoices</h1><p className="page-subtitle">Track billing and payments</p></div>
              <button className="btn btn-primary" onClick={() => { if(showCreate) resetForm(); else setShowCreate(true); }}>{showCreate ? 'Cancel' : '+ New Invoice'}</button>
            </div>
            
            {showCreate && (
              <div className="card" style={{ padding: 24, marginBottom: 24, position: 'relative' }}>
                <button onClick={resetForm} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                <h2 style={{ marginBottom: 16 }}>{editingEntity ? 'Edit Invoice' : 'Create Invoice'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 200px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Client</label>
                    <select required className="input-base" style={{ background: 'var(--bg-primary)', width: '100%' }} value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value, projectId: ''})}>
                      <option value="">Select Client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.companyName || c.name || c.email}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: '1 1 200px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Project</label>
                    <select required className="input-base" style={{ background: 'var(--bg-primary)', width: '100%' }} value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} disabled={!formData.clientId}>
                      <option value="">Select Project</option>
                      {projects.filter(p => p.clientId === formData.clientId).map(p => <option key={p.id} value={p.id}>{p.name || p.title}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: '1 1 120px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Amount ($)</label><input type="number" step="0.01" className="input-base" style={{ width: '100%' }} value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required /></div>
                  
                  <div style={{ flex: '1 1 120px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Status</label><select className="input-base" style={{ background: 'var(--bg-primary)', width: '100%' }} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="UNPAID">UNPAID</option><option value="PAID">PAID</option></select></div>
                  
                  <button type="submit" className="btn btn-danger" disabled={isSubmitting} style={{ height: 42 }}>{isSubmitting ? 'Saving...' : 'Save'}</button>
                </form>
              </div>
            )}
            
            <div className="card-elevated" style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, position: 'relative' }}><Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} /><input className="input-base" style={{ paddingLeft: 40 }} placeholder="Search by Invoice ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                <select className="input-base" style={{ width: 180, background: 'var(--bg-primary)' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="ALL">All Statuses</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="OVERDUE">Overdue</option></select>
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Invoice ID</th><th>Client</th><th>Project</th><th>Amount</th><th>Status</th><th>Created At</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map(i => (
                      <tr key={i.id}>
                        <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{i.id}</td>
                        <td>{clients.find(c => c.id === i.clientId)?.name || clients.find(c => c.id === i.clientId)?.companyName || i.clientId || 'N/A'}</td>
                        <td>{projects.find(p => p.id === i.projectId)?.name || i.projectId || 'N/A'}</td>
                        <td>${i.amount}</td>
                        <td><span className={`badge ${String(i.status).toUpperCase() === 'PAID' ? 'badge-green' : 'badge-gray'}`}>{String(i.status || 'UNPAID').toUpperCase()}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{formatDate(i.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => window.open(`/invoices/${i.id}/print?type=invoice`, '_blank', 'noopener,noreferrer')} title="Export Invoice" style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', marginRight: 12 }}><FileText size={16} /></button>
                          <button onClick={() => window.open(`/invoices/${i.id}/print?type=receipt`, '_blank', 'noopener,noreferrer')} title="Export Receipt" style={{ background: 'none', border: 'none', color: 'var(--brand-red)', cursor: 'pointer', marginRight: 12 }}><Printer size={16} /></button>
                          <button onClick={() => startEdit(i)} title="Edit" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginRight: 12 }}><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(i.id)} title="Delete" style={{ background: 'none', border: 'none', color: 'var(--brand-red)', cursor: 'pointer' }}><Trash2 size={16} /></button>
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
}
