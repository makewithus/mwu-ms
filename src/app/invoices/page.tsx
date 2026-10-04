'use client';
import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { toast } from '@/components/ui/Toast';
import { confirmAction } from '@/components/ui/ConfirmModal';
import { Edit2, Trash2, Search, X } from 'lucide-react';

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
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [formData, setFormData] = useState({ amount: '', status: 'PENDING' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handle = (e: any) => { setIsMobile(e.matches); setSidebarOpen(!e.matches); };
    handle(mq); mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/invoices');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (err: any) { toast.error(err.message || 'Operation failed'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;
    setIsSubmitting(true);
    try {
      const url = editingEntity ? `/api/invoices/${editingEntity.id}` : '/api/invoices';
      const method = editingEntity ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error(editingEntity ? 'Update failed' : 'Creation failed');
      resetForm();
      await fetchInvoices();
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
      if (!res.ok) throw new Error('Delete failed');
      await fetchInvoices();
      toast.success('Invoice deleted successfully.');
    } catch (err: any) { toast.error(err.message || 'Failed to delete invoice. Please try again.'); }
  };

  const startEdit = (inv: any) => {
    setEditingEntity(inv);
    setFormData({ amount: inv.amount || '', status: inv.status || 'PENDING' });
    setShowCreate(true);
  };

  const resetForm = () => {
    setFormData({ amount: '', status: 'PENDING' });
    setEditingEntity(null); setShowCreate(false);
  };

  const filtered = invoices.filter(i => {
    const matchesSearch = (i.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || String(i.status || 'PENDING').toUpperCase() === filterStatus;
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
                  <div style={{ flex: '1 1 200px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Amount ($)</label><input type="number" step="0.01" className="input-base" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required /></div>
                  
                  <div style={{ flex: '1 1 150px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Status</label><select className="input-base" style={{ background: 'var(--bg-primary)' }} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="PENDING">PENDING</option><option value="PAID">PAID</option><option value="OVERDUE">OVERDUE</option></select></div>
                  
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
                  <thead><tr><th>Invoice ID</th><th>Amount</th><th>Status</th><th>Created At</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map(i => (
                      <tr key={i.id}>
                        <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{i.id}</td>
                        <td>${i.amount}</td>
                        <td><span className={`badge ${String(i.status).toUpperCase() === 'PAID' ? 'badge-green' : String(i.status).toUpperCase() === 'OVERDUE' ? 'badge-red' : 'badge-gray'}`}>{String(i.status || 'PENDING').toUpperCase()}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{formatDate(i.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => startEdit(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginRight: 12 }}><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(i.id)} style={{ background: 'none', border: 'none', color: 'var(--brand-red)', cursor: 'pointer' }}><Trash2 size={16} /></button>
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
