'use client';
import { useEffect, useState, useMemo } from 'react';
import { fetchWithAuth, getCachedApiData, invalidateApiCache } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { toast } from '@/components/ui/Toast';
import { Settings, Plus, X, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission } from '@/lib/auth/rbac';

export default function SystemUsersPage() {
  const { userData, loading: authLoading, user } = useAuth();
  const canManage = hasPermission(userData?.role, 'canManageSystemUsers');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [users, setUsers] = useState<any[]>(() => getCachedApiData<{ users?: any[] }>('/api/system-users')?.users || []);
  const [loading, setLoading] = useState(() => !getCachedApiData('/api/system-users'));
  
  // Create / Edit State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', email: '', password: '', role: 'MANAGER', status: 'active' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handle = (e: any) => { setIsMobile(e.matches); setSidebarOpen(!e.matches); };
    handle(mq); mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetchWithAuth('/api/system-users');
      if (!res.ok) throw new Error('Failed to fetch system users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    loadUsers();
  }, [authLoading, user]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({ id: '', name: '', email: '', password: '', role: 'MANAGER', status: 'active' });
    setShowModal(true);
  };

  const handleOpenEdit = (u: any) => {
    setIsEditing(true);
    setFormData({ 
      id: u.id, 
      name: u.name || (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.email === 'admin@mwums.com' ? 'System Admin' : '')), 
      email: u.email, 
      password: '', // blank password when editing
      role: u.role, 
      status: (u.status || 'active').toLowerCase() 
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setIsSubmitting(true);
    try {
      if (isEditing) {
        const payload: any = { id: formData.id, name: formData.name, role: formData.role, status: formData.status };
        if (formData.password) {
          payload.password = formData.password;
        }
        const res = await fetchWithAuth('/api/system-users', { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update user');
        toast.success('System user updated successfully!');
      } else {
        const res = await fetchWithAuth('/api/system-users', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(formData) 
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create user');
        toast.success('System user created successfully!');
      }
      setShowModal(false);
      loadUsers();
    } catch (err: any) { 
      toast.error(err.message || 'Error saving user'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) return;
    if (!window.confirm('Are you sure you want to delete this system user? This action cannot be undone.')) return;
    try {
      const res = await fetchWithAuth(`/api/system-users?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      toast.success('System user deleted successfully!');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting user');
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = (u.name || u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const statusValue = (u.status || 'active').toLowerCase();
      const matchesStatus = statusFilter === 'ALL' || statusValue === statusFilter.toLowerCase();
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  return (
    <ProtectedRoute requiredPermission="canManageSystemUsers">
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          
          <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <div className="page-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title flex items-center gap-2">
                    <Settings size={24} className="text-brand-red" />
                    System Administrators
                  </h1>
                  <p className="page-subtitle">Manage portal access for admins and managers.</p>
                </div>
                {canManage && (
                  <button onClick={handleOpenCreate} className="btn btn-primary">
                    <Plus size={16} /> Add System User
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="card-elevated" style={{ padding: 24, marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Search</label>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: 16, top: 14, color: 'var(--text-muted)' }} />
                      <input 
                        type="text" 
                        className="input-base w-full" 
                        style={{ paddingLeft: 44, height: 44 }} 
                        placeholder="Search by name or email..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Role</label>
                    <select className="input-base w-full" style={{ height: 44 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                      <option value="ALL">All Roles</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</label>
                    <select className="input-base w-full" style={{ height: 44 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                      <option value="ALL">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="card-elevated" style={{ padding: 24 }}>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ padding: '16px 24px' }}>User</th>
                        <th style={{ padding: '16px 24px' }}>Email</th>
                        <th style={{ padding: '16px 24px' }}>Role</th>
                        <th style={{ padding: '16px 24px' }}>Status</th>
                        {canManage && <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={canManage ? 5 : 4} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                            Loading users...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={canManage ? 5 : 4} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No system users found matching filters.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id}>
                            <td style={{ fontWeight: 500, padding: '16px 24px' }}>
                              {u.name || (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.email === 'admin@mwums.com' ? 'System Admin' : 'Unknown User'))}
                            </td>
                            <td style={{ color: 'var(--text-muted)', padding: '16px 24px' }}>{u.email}</td>
                            <td style={{ padding: '16px 24px' }}>
                              <div style={{ 
                                display: 'inline-block', 
                                padding: '4px 10px', 
                                borderRadius: 4, 
                                fontSize: 12, 
                                fontWeight: 600,
                                background: u.role === 'SUPER_ADMIN' ? 'rgba(255,49,49,0.1)' : 'var(--bg-dark)',
                                color: u.role === 'SUPER_ADMIN' ? 'var(--brand-red)' : 'var(--text-inverse)',
                                border: '1px solid var(--border)'
                              }}>
                                {u.role.replace('_', ' ')}
                              </div>
                            </td>
                            <td style={{ padding: '16px 24px' }}>
                              <span className={`badge ${(u.status || 'active').toLowerCase() === 'active' ? 'badge-green' : 'badge-gray'}`}>
                                {(u.status || 'active').toLowerCase() === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            {canManage && (
                              <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                  <button onClick={() => handleOpenEdit(u)} className="text-gray-400 hover:text-white transition-colors" title="Edit User">
                                    <Edit size={18} />
                                  </button>
                                  <button onClick={() => handleDelete(u.id)} className="text-gray-400 hover:text-brand-red transition-colors" title="Delete User">
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="card w-full" style={{ maxWidth: 500, padding: '40px 48px' }}>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight">{isEditing ? 'Edit System User' : 'Add System User'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                  <input required type="text" className="input-base" style={{ padding: '14px 16px', fontSize: 15 }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                  <input required={!isEditing} disabled={isEditing} type="email" className="input-base w-full" style={{ padding: '14px 16px', fontSize: 15, opacity: isEditing ? 0.5 : 1, cursor: isEditing ? 'not-allowed' : 'text' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isEditing ? 'New Password (Optional)' : 'Password'}
                  </label>
                  <input required={!isEditing} type="text" className="input-base w-full" style={{ padding: '14px 16px', fontSize: 15 }} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={isEditing ? 'Leave blank to keep current password' : ''} />
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Make sure to securely share this with the user.</p>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</label>
                  <select required className="input-base w-full" style={{ padding: '14px 16px', fontSize: 15 }} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="MANAGER">Manager</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
                {isEditing && (
                  <div>
                    <label style={{ display: 'block', marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                    <select required className="input-base w-full" style={{ padding: '14px 16px', fontSize: 15 }} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 12, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ padding: '12px 24px' }}>Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ padding: '12px 24px' }}>
                    {isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create User')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
