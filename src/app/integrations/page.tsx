'use client';
import { useEffect, useState } from 'react';
import { fetchWithAuth, parseApiResponse } from '@/lib/api-client';
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

export default function IntegrationsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [formData, setFormData] = useState({ type: '', entityId: '', status: 'PENDING' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handle = (e: any) => { setIsMobile(e.matches); setSidebarOpen(!e.matches); };
    handle(mq); mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/integrations/events');
      const data = await parseApiResponse<{ events?: any[] }>(res);
      setEvents(data.events || []);
    } catch (err: any) { toast.error(err.message || 'Operation failed'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type) return;
    setIsSubmitting(true);
    try {
      const url = editingEntity ? `/api/integrations/events/${editingEntity.id}` : '/api/integrations/events';
      const method = editingEntity ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error(editingEntity ? 'Update failed' : 'Creation failed');
      resetForm();
      await fetchEvents();
      toast.success(editingEntity ? 'Event updated successfully.' : 'Integration event created successfully.');
    } catch (err: any) { toast.error(err.message || 'Failed to save event. Please try again.'); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({
      title: 'Delete Event',
      message: 'This will permanently remove this integration event from the log. This action cannot be undone.',
      confirmLabel: 'Yes, Delete Event',
      type: 'danger',
    }))) return;
    try {
      const res = await fetchWithAuth(`/api/integrations/events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchEvents();
      toast.success('Event deleted successfully.');
    } catch (err: any) { toast.error(err.message || 'Failed to delete event. Please try again.'); }
  };

  const handleRetry = async (eventId: string) => {
    try {
      const res = await fetchWithAuth(`/api/integrations/events/${eventId}/retry`, { method: 'POST' });
      if (!res.ok) throw new Error('Retry failed');
      await fetchEvents();
      toast.success('Event queued for retry successfully.');
    } catch (err: any) { toast.error(err.message || 'Operation failed'); }
  };

  const startEdit = (ev: any) => {
    setEditingEntity(ev);
    setFormData({ type: ev.type || '', entityId: ev.entityId || '', status: ev.status || 'PENDING' });
    setShowCreate(true);
  };

  const resetForm = () => {
    setFormData({ type: '', entityId: '', status: 'PENDING' });
    setEditingEntity(null); setShowCreate(false);
  };

  const filtered = events.filter(e => {
    const matchesSearch = (e.type || '').toLowerCase().includes(searchTerm.toLowerCase()) || (e.entityId || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || String(e.status || 'PENDING').toUpperCase() === filterStatus;
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
              <div><h1 className="page-title">Integrations Log</h1><p className="page-subtitle">Monitor and retry central event propagations</p></div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-ghost" onClick={() => fetchEvents()}>Refresh Logs</button>
                <button className="btn btn-primary" onClick={() => { if(showCreate) resetForm(); else setShowCreate(true); }}>{showCreate ? 'Cancel' : '+ New Event'}</button>
              </div>
            </div>
            
            {showCreate && (
              <div className="card" style={{ padding: 24, marginBottom: 24, position: 'relative' }}>
                <button onClick={resetForm} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                <h2 style={{ marginBottom: 16 }}>{editingEntity ? 'Edit Event' : 'Create Event'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 200px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Event Type</label><input className="input-base" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} placeholder="e.g. USER_CREATED" required /></div>
                  <div style={{ flex: '1 1 200px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Entity ID</label><input className="input-base" value={formData.entityId} onChange={e => setFormData({...formData, entityId: e.target.value})} placeholder="UUID" /></div>
                  <div style={{ flex: '1 1 150px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Status</label><select className="input-base" style={{ background: 'var(--bg-primary)' }} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="PENDING">PENDING</option><option value="COMPLETED">COMPLETED</option><option value="FAILED">FAILED</option></select></div>
                  <button type="submit" className="btn btn-danger" disabled={isSubmitting} style={{ height: 42 }}>{isSubmitting ? 'Saving...' : 'Save'}</button>
                </form>
              </div>
            )}
            
            <div className="card-elevated" style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, position: 'relative' }}><Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} /><input className="input-base" style={{ paddingLeft: 40 }} placeholder="Search by event type or entity ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                <select className="input-base" style={{ width: 180, background: 'var(--bg-primary)' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="ALL">All Statuses</option><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="FAILED">Failed</option></select>
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Event Type</th><th>Entity ID</th><th>Status</th><th>Created At</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map(ev => (
                      <tr key={ev.id}>
                        <td style={{ fontWeight: 600 }}>{ev.type}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{ev.entityId}</td>
                        <td><span className={`badge ${ev.status === 'COMPLETED' ? 'badge-green' : ev.status === 'FAILED' ? 'badge-red' : 'badge-gray'}`}>{ev.status}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{formatDate(ev.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            {ev.status === 'FAILED' && <button onClick={() => handleRetry(ev.id)} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--text-primary)' }}>Retry</button>}
                            <button onClick={() => startEdit(ev)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(ev.id)} style={{ background: 'none', border: 'none', color: 'var(--brand-red)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                          </div>
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
