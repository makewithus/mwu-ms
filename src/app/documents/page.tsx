'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { toast } from '@/components/ui/Toast';
import { confirmAction } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/lib/auth/auth-context';
import { db } from '@/lib/firebase/client';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  FolderOpen,
  Upload,
  Search,
  Filter,
  FileText,
  Trash2,
  Download,
  Plus,
  Loader2,
  X,
  File,
  Check,
  Star,
  Pin,
  Tag,
  Users,
  Coins,
  FileCheck,
  ShieldCheck,
  BookOpen,
  FolderLock,
} from 'lucide-react';

const FOLDERS = [
  { id: 'all', name: 'All Documents', icon: FolderOpen },
  { id: 'employee', name: 'Employee Documents', icon: Users },
  { id: 'offer', name: 'Offer Letters', icon: FileText },
  { id: 'payslips', name: 'Payslips', icon: Coins },
  { id: 'contracts', name: 'Contracts & Agreements', icon: FileCheck },
  { id: 'policies', name: 'Company Policies', icon: ShieldCheck },
  { id: 'training', name: 'Training Material', icon: BookOpen },
  { id: 'hr', name: 'HR Internal Files', icon: FolderLock },
];

type DocumentItem = {
  id: string;
  name: string;
  type: string;
  size: number;
  folderId: string;
  folderName: string;
  department?: string;
  uploader?: string;
  visibility: 'Public' | 'Admin' | 'Employee';
  pinned?: boolean;
  url?: string;
  createdAt?: any;
};

export default function DocumentsPage() {
  const { user, userData } = useAuth();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDoc, setNewDoc] = useState({
    name: '',
    folderId: 'policies',
    department: 'All Departments',
    visibility: 'Public' as 'Public' | 'Admin' | 'Employee',
    fileType: 'pdf',
    sizeBytes: 154200,
  });


  // Real-time Firestore Documents Listener
  useEffect(() => {
    const q = query(collection(db, 'documents'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: DocumentItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Untitled Document',
            type: data.type || 'pdf',
            size: data.size || 250000,
            folderId: data.folderId || 'employee',
            folderName: data.folderName || 'General',
            department: data.department || 'All',
            uploader: data.uploader || 'Admin',
            visibility: data.visibility || 'Public',
            pinned: data.pinned || false,
            url: data.url || '#',
            createdAt: data.createdAt,
          };
        });
        setDocuments(rows);
        setLoading(false);
      },
      (err) => {
        console.error('Documents listener error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Create / Upload Document Record
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.name.trim()) {
      toast.error('Document title is required');
      return;
    }

    setUploading(true);
    try {
      const folderObj = FOLDERS.find((f) => f.id === newDoc.folderId);
      await addDoc(collection(db, 'documents'), {
        name: newDoc.name.trim(),
        type: newDoc.fileType,
        size: newDoc.sizeBytes,
        folderId: newDoc.folderId,
        folderName: folderObj?.name || 'General',
        department: newDoc.department,
        visibility: newDoc.visibility,
        uploader: userData?.name || user?.displayName || 'Central Admin',
        pinned: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'auditLogs'), {
        actorId: user?.uid || 'admin',
        actorRole: userData?.role || 'SUPER_ADMIN',
        action: 'DOCUMENT_UPLOADED',
        entityType: 'DOCUMENT',
        timestamp: new Date().toISOString(),
        result: 'SUCCESS',
        details: { name: newDoc.name, folder: folderObj?.name },
      }).catch(() => {});

      toast.success('Document uploaded and synchronized with EMS!');
      setShowUploadModal(false);
      setNewDoc({
        name: '',
        folderId: 'policies',
        department: 'All Departments',
        visibility: 'Public',
        fileType: 'pdf',
        sizeBytes: 154200,
      });
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (id: string, currentPin: boolean) => {
    try {
      await updateDoc(doc(db, 'documents', id), {
        pinned: !currentPin,
        updatedAt: serverTimestamp(),
      });
      toast.success(currentPin ? 'Document unpinned' : 'Document pinned to top');
    } catch {
      toast.error('Failed to update document');
    }
  };

  // Delete Document
  const handleDeleteDocument = async (id: string, name: string) => {
    const ok = await confirmAction({
      title: 'Delete Document',
      message: `Are you sure you want to permanently delete "${name}"?`,
      confirmText: 'Delete Document',
      confirmColor: 'var(--brand-red)',
    });
    if (!ok) return;

    try {
      await deleteDoc(doc(db, 'documents', id));
      toast.success('Document deleted successfully');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      const matchFolder = activeFolder === 'all' || d.folderId === activeFolder;
      const matchSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.department && d.department.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchFolder && matchSearch;
    });
  }, [documents, activeFolder, searchTerm]);

  const formatSize = (bytes: number) => {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <AdminLayout>
      <div className="page-container" style={{ paddingBottom: 60 }}>
              {/* Header */}
              <div className="page-header" style={{ marginBottom: 20 }}>
                <div>
                  <h1 className="page-title">Documents Repository</h1>
                  <p className="page-subtitle">Central file management, company policies, and contract storage</p>
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn btn-primary"
                  style={{ gap: 8, padding: '8px 16px', fontSize: 13 }}
                >
                  <Upload size={15} /> Upload Document
                </button>
              </div>

              {/* Folder Category Pills */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 16 }}>
                {FOLDERS.map((f) => {
                  const Icon = f.icon;
                  const isSelected = activeFolder === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setActiveFolder(f.id)}
                      className={`btn ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '6px 14px', fontSize: 12, whiteSpace: 'nowrap', gap: 7, display: 'inline-flex', alignItems: 'center' }}
                    >
                      <Icon size={13} style={{ flexShrink: 0, opacity: isSelected ? 1 : 0.7 }} />
                      <span>{f.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="card" style={{ padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search documents by title or department..."
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

              {/* Document List */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                  <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading real-time documents...</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <FolderOpen size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No documents found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Upload documents or select another folder above.</div>
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Document Name</th>
                          <th>Folder</th>
                          <th>Department</th>
                          <th>Visibility</th>
                          <th>File Size</th>
                          <th>Uploaded By</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((d) => (
                          <tr key={d.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <FileText size={18} color="var(--brand-red)" />
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{d.name}</span>
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-gray" style={{ fontSize: 11 }}>
                                {d.folderName}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.department}</td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: d.visibility === 'Public' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                                  color: d.visibility === 'Public' ? '#22c55e' : 'var(--text-muted)',
                                  fontSize: 10,
                                }}
                              >
                                {d.visibility}
                              </span>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatSize(d.size)}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.uploader}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 6 }}>
                                <button
                                  onClick={() => handleTogglePin(d.id, !!d.pinned)}
                                  className="btn btn-ghost"
                                  style={{ padding: '4px 8px', color: d.pinned ? 'var(--accent-amber)' : 'var(--text-muted)' }}
                                  title={d.pinned ? 'Unpin' : 'Pin to top'}
                                >
                                  <Pin size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteDocument(d.id, d.name)}
                                  className="btn btn-ghost"
                                  style={{ padding: '4px 8px', color: 'var(--brand-red)' }}
                                  title="Delete Document"
                                >
                                  <Trash2 size={13} />
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

        {/* UPLOAD DOCUMENT MODAL */}
        {showUploadModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 16,
            }}
            onClick={() => setShowUploadModal(false)}
          >
            <div
              className="card"
              style={{
                width: 480,
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: 28,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-strong)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Upload Document</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Publish a document to the shared EMS repository
                  </p>
                </div>
                <button onClick={() => setShowUploadModal(false)} className="btn btn-ghost" style={{ padding: 6 }}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleUploadDocument} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Document Title <span style={{ color: 'var(--brand-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="input-base"
                    placeholder="e.g. Employee Code of Conduct 2026"
                    value={newDoc.name}
                    onChange={(e) => setNewDoc((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Folder Category
                    </label>
                    <select
                      className="input-base"
                      value={newDoc.folderId}
                      onChange={(e) => setNewDoc((p) => ({ ...p, folderId: e.target.value }))}
                    >
                      {FOLDERS.filter((f) => f.id !== 'all').map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Visibility
                    </label>
                    <select
                      className="input-base"
                      value={newDoc.visibility}
                      onChange={(e) => setNewDoc((p) => ({ ...p, visibility: e.target.value as any }))}
                    >
                      <option value="Public">Public (All Employees)</option>
                      <option value="Admin">Admin Only</option>
                      <option value="Employee">Employee Specific</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Department Target
                  </label>
                  <input
                    type="text"
                    className="input-base"
                    placeholder="e.g. All Departments, Engineering, HR"
                    value={newDoc.department}
                    onChange={(e) => setNewDoc((p) => ({ ...p, department: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)} disabled={uploading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={uploading} style={{ gap: 6 }}>
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploading ? 'Uploading…' : 'Upload File'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </AdminLayout>
  );
}
