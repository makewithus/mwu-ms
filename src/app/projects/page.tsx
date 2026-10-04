'use client';
import { useEffect, useState } from 'react';
import { fetchWithAuth, parseApiResponse } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { ChevronDown, Edit2, Trash2, Search, X } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { confirmAction } from '@/components/ui/ConfirmModal';

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

export default function ProjectsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', clientId: '', status: 'IN_PROGRESS' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handle = (e: any) => { setIsMobile(e.matches); setSidebarOpen(!e.matches); };
    handle(mq); mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, clientsRes] = await Promise.all([
        fetchWithAuth('/api/projects'),
        fetchWithAuth('/api/clients')
      ]);
      const projData = await parseApiResponse<{ projects?: any[] }>(projRes);
      const clientsData = await parseApiResponse<{ clients?: any[] }>(clientsRes);
      setProjects(projData.projects || []);
      setClients(clientsData.clients || []);
    } catch (err: any) { toast.error(err.message || 'Operation failed'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.clientId) return;
    setIsSubmitting(true);
    try {
      const url = editingEntity ? `/api/projects/${editingEntity.id}` : '/api/projects';
      const method = editingEntity ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error(editingEntity ? 'Update failed' : 'Creation failed');
      resetForm();
      await fetchData();
      toast.success(editingEntity ? 'Project updated successfully.' : 'Project created successfully.');
    } catch (err: any) { toast.error(err.message || 'Failed to save project. Please try again.'); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({
      title: 'Delete Project',
      message: 'This will permanently remove the project from the MWU ecosystem. This action cannot be undone.',
      confirmLabel: 'Yes, Delete Project',
      type: 'danger',
    }))) return;
    try {
      const res = await fetchWithAuth(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchData();
      toast.success('Project deleted successfully.');
    } catch (err: any) { toast.error(err.message || 'Failed to delete project. Please try again.'); }
  };

  const startEdit = (proj: any) => {
    setEditingEntity(proj);
    setFormData({ name: proj.name || '', clientId: proj.clientId || '', status: proj.status || 'IN_PROGRESS' });
    setShowCreate(true);
  };

  const resetForm = () => {
    setFormData({ name: '', clientId: '', status: 'IN_PROGRESS' });
    setEditingEntity(null); setShowCreate(false); setDropdownOpen(false);
  };

  const getClientName = (id: string) => {
    const client = clients.find(c => c.id === id);
    return client ? (client.companyName || client.name) : id;
  };

  const filtered = projects.filter(p => {
    const clientName = getClientName(p.clientId) || '';
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || String(p.status || 'IN_PROGRESS').toUpperCase() === filterStatus;
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
              <div><h1 className="page-title">Project Management</h1><p className="page-subtitle">Manage projects and access controls</p></div>
              <button className="btn btn-primary" onClick={() => { if(showCreate) resetForm(); else setShowCreate(true); }}>{showCreate ? 'Cancel' : '+ New Project'}</button>
            </div>
            
            {showCreate && (
              <div className="card" style={{ padding: 24, marginBottom: 24, position: 'relative' }}>
                <button onClick={resetForm} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                <h2 style={{ marginBottom: 16 }}>{editingEntity ? 'Edit Project' : 'Create Project'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 200px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Project Name</label><input className="input-base" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                  
                  <div style={{ flex: '1 1 200px', position: 'relative' }}>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Client</label>
                    <div className="input-base" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setDropdownOpen(!dropdownOpen)}>
                      <span style={{ color: formData.clientId ? 'var(--text-primary)' : 'var(--text-muted)' }}>{formData.clientId ? getClientName(formData.clientId) : 'Select a client...'}</span>
                      <ChevronDown size={16} color="var(--text-muted)" />
                    </div>
                    {dropdownOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border)', marginTop: 4, borderRadius: 4, zIndex: 50, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        {clients.map(c => (
                          <div key={c.id} style={{ padding: '10px 12px', fontSize: 13, cursor: 'pointer', background: formData.clientId === c.id ? 'rgba(255,49,49,0.1)' : 'transparent', color: formData.clientId === c.id ? 'var(--brand-red)' : 'var(--text-primary)' }} onClick={() => { setFormData({...formData, clientId: c.id}); setDropdownOpen(false); }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }} onMouseOut={(e) => { e.currentTarget.style.background = formData.clientId === c.id ? 'rgba(255,49,49,0.1)' : 'transparent'; }}>
                            {c.companyName || c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {editingEntity && (
                    <div style={{ flex: '1 1 150px' }}><label className="block text-xs font-bold text-gray-500 mb-1">Status</label><select className="input-base" style={{ background: 'var(--bg-primary)' }} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="IN_PROGRESS">IN PROGRESS</option><option value="ONBOARDING">ONBOARDING</option><option value="COMPLETED">COMPLETED</option><option value="ACTIVE">ACTIVE</option></select></div>
                  )}
                  
                  <button type="submit" className="btn btn-danger" disabled={isSubmitting} style={{ height: 42 }}>{isSubmitting ? 'Saving...' : 'Save'}</button>
                </form>
              </div>
            )}
            
            <div className="card-elevated" style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, position: 'relative' }}><Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} /><input className="input-base" style={{ paddingLeft: 40 }} placeholder="Search projects or clients..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                <select className="input-base" style={{ width: 180, background: 'var(--bg-primary)' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="ALL">All Statuses</option><option value="IN_PROGRESS">In Progress</option><option value="ONBOARDING">Onboarding</option><option value="COMPLETED">Completed</option><option value="ACTIVE">Active</option></select>
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Project Name</th><th>Client</th><th>Created At</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td><td>{getClientName(p.clientId)}</td><td>{formatDate(p.createdAt)}</td>
                        <td><span className={`badge ${String(p.status).toUpperCase() === 'IN_PROGRESS' || String(p.status).toUpperCase() === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{String(p.status || 'ACTIVE').replace('_', ' ').toUpperCase()}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => startEdit(p)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginRight: 12 }}><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: 'var(--brand-red)', cursor: 'pointer' }}><Trash2 size={16} /></button>
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
