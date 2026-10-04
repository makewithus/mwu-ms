'use client';
import { useEffect, useState } from 'react';
import { apiGet, fetchWithAuth, getCachedApiData, invalidateApiCache } from '@/lib/api-client';
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

export default function ClientsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [clients, setClients] = useState<any[]>(() => getCachedApiData<{ clients?: any[] }>('/api/clients')?.clients || []);
  const [loading, setLoading] = useState(() => !getCachedApiData('/api/clients'));
  
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

  const fetchClients = async (force = false) => {
    if (clients.length === 0) setLoading(true);
    try {
      const data = await apiGet<{ clients?: any[] }>('/api/clients', { force });
      setClients(data.clients || []);
    } catch (err: any) { toast.error(err.message || 'Operation failed'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingEntity ? `/api/clients/${editingEntity.id}` : '/api/clients';
      const method = editingEntity ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || (editingEntity ? 'Update failed' : 'Creation failed'));
      invalidateApiCache(['/api/clients', '/api/dashboard/stats']);
      setClients(prev => editingEntity
        ? prev.map(client => client.id === editingEntity.id ? { ...client, ...formData, updatedAt: new Date().toISOString() } : client)
        : [{ ...saved, ...formData }, ...prev]
      );
      resetForm();
      void fetchClients(true);
      toast.success(editingEntity ? 'Client updated successfully.' : 'Client added successfully.');
    } catch (err: any) { toast.error(err.message || 'Failed to save client. Please try again.'); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({
      title: 'Delete Client',
      message: 'This will permanently remove the client from the MWU ecosystem. All associated data will be affected. This action cannot be undone.',
      confirmLabel: 'Yes, Delete Client',
      type: 'danger',
    }))) return;
    try {
      const res = await fetchWithAuth(`/api/clients/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      invalidateApiCache(['/api/clients', '/api/dashboard/stats']);
      setClients(prev => prev.filter(client => client.id !== id));
      void fetchClients(true);
      toast.success('Client deleted successfully.');
    } catch (err: any) { toast.error(err.message || 'Failed to delete client. Please try again.'); }
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
                        <td><span className={`badge ${String(c.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{String(c.status || 'ACTIVE').toUpperCase()}</span></td>
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
}
