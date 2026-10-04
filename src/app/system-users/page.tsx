'use client';
import { useEffect, useState } from 'react';
import { fetchWithAuth, getCachedApiData, invalidateApiCache } from '@/lib/api-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { toast } from '@/components/ui/Toast';
import { Settings, Plus, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission } from '@/lib/auth/rbac';

export default function SystemUsersPage() {
  const { userData } = useAuth();
  const canManage = hasPermission(userData?.role, 'canManageSystemUsers');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [users, setUsers] = useState<any[]>(() => getCachedApiData<{ users?: any[] }>('/api/system-users')?.users || []);
  const [loading, setLoading] = useState(() => !getCachedApiData('/api/system-users'));
  
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'MANAGER' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/system-users', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(formData) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      
      toast.success('System user created successfully!');
      setShowCreate(false);
      setFormData({ name: '', email: '', password: '', role: 'MANAGER' });
      loadUsers();
    } catch (err: any) { 
      toast.error(err.message || 'Error creating user'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <ProtectedRoute requiredPermission="canManageSystemUsers">
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">
              <div>
                <h1 className="page-title flex items-center gap-2">
                  <Settings size={24} className="text-brand-red" />
                  System Administrators
                </h1>
                <p className="page-subtitle">Manage portal access for admins and managers.</p>
              </div>
              {canManage && (
                <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
                  <Plus size={16} /> Add System User
                </button>
              )}
            </div>

            <div className="card-elevated" style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-dark)' }}>
                      <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>User</th>
                      <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Email</th>
                      <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Role</th>
                      <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                          Loading users...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                          No system users found.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '16px 24px', fontWeight: 500 }}>{u.name}</td>
                          <td style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>{u.email}</td>
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
                            <span style={{ color: u.status === 'active' ? '#10B981' : 'var(--text-muted)' }}>
                              {u.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="card-elevated w-full max-w-md" style={{ padding: 32 }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Add System User</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Full Name</label>
                  <input required type="text" className="input-base" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Email Address</label>
                  <input required type="email" className="input-base" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Password</label>
                  <input required type="text" className="input-base" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  <p className="text-xs text-gray-500 mt-2">Make sure to securely share this with the user.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Role</label>
                  <select required className="input-base" style={{ background: 'var(--bg-primary)' }} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}>Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                    {isSubmitting ? 'Creating...' : 'Create User'}
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
