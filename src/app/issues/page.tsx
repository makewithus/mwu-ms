'use client';

import { useState, useRef, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { toast } from '@/components/ui/Toast';
import {
  AlertCircle,
  Mic,
  MicOff,
  RotateCw,
  ExternalLink,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  X,
  Check,
  Send,
  Loader2,
  Plus,
} from 'lucide-react';

interface Issue {
  number: number;
  title: string;
  status: string;
  priority: string;
  created: string;
}

interface PreviewData {
  confirmation_message: string;
  action: string;
  success: boolean;
  fields: Record<string, unknown>;
  needs_clarification: boolean;
  confidence: number;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: 'var(--brand-red)', bg: 'rgba(255, 49, 49, 0.15)' },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  blocked: { label: 'Blocked', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  resolved: { label: 'Resolved', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: 'High', color: 'var(--brand-red)', bg: 'rgba(255, 49, 49, 0.15)' },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  low: { label: 'Low', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
};

const ALL_STATUSES = ['all', 'open', 'resolved', 'blocked'];
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [docId, setDocId] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docConnected, setDocConnected] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [fetching, setFetching] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [savedDocs, setSavedDocs] = useState<{ id: string; url: string; name: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Load saved doc on page open
  useEffect(() => {
    const savedId = localStorage.getItem('ems_doc_id');
    const savedUrl = localStorage.getItem('ems_doc_url');
    if (savedId && savedUrl) {
      setDocId(savedId);
      setDocUrl(savedUrl);
      setDocConnected(true);
      fetchIssues(savedId);
    }
  }, []);

  // Speech recognition
  useEffect(() => {
    const windowWithSpeech = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SR = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = 'en-US';

    r.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '',
        final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(interim);
      if (final) {
        setText((p) => (p ? p + ' ' + final : final).trim());
        setTranscript('');
      }
    };
    r.onend = () => {
      setIsListening(false);
      setTranscript('');
    };
    r.onerror = (e: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      if (e.error !== 'no-speech') setError('Mic error: ' + e.error);
    };
    recognitionRef.current = r;
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const extractDocId = (url: string) => {
    const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const connectDoc = async () => {
    const id = extractDocId(urlInput);
    if (!id) {
      setUrlError('Invalid Google Doc URL. Must contain /document/d/...');
      return;
    }
    setUrlError('');
    localStorage.setItem('ems_doc_id', id);
    localStorage.setItem('ems_doc_url', urlInput);

    try {
      const res = await fetch(`${API_URL}/api/actions/doc-title?doc_id=${id}`);
      const data = await res.json();
      const name = data.title || `Doc ${savedDocs.length + 1}`;
      if (!savedDocs.find((d) => d.id === id)) {
        setSavedDocs((prev) => [...prev, { id, url: urlInput, name }]);
      }
    } catch {
      if (!savedDocs.find((d) => d.id === id)) {
        setSavedDocs((prev) => [...prev, { id, url: urlInput, name: `Doc ${savedDocs.length + 1}` }]);
      }
    }

    setDocId(id);
    setDocUrl(urlInput);
    setDocConnected(true);
    fetchIssues(id);
    toast.success('Connected to Google Doc successfully!');
  };

  const fetchIssues = async (id: string) => {
    setFetching(true);
    try {
      const res = await fetch(`${API_URL}/api/actions/issues?doc_id=${id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.issues)) {
        setIssues(data.issues);
      } else {
        toast.error(data.error || 'No issues found in document');
      }
    } catch {
      toast.error('Could not reach backend service for document issues');
    } finally {
      setFetching(false);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !docId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/actions/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, doc_id: docId }),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(data as PreviewData);
      } else {
        setError(data.error || 'Could not understand command.');
      }
    } catch {
      setError('Backend service not reachable.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/actions/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, doc_id: docId, confirmed: true }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        toast.success(data.message || 'Action executed successfully!');
        setPreview(null);
        setText('');
        setPanelOpen(false);
        setTimeout(() => fetchIssues(docId), 1500);
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(data.error || 'Execution failed.');
      }
    } catch {
      setError('Backend service not reachable.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = issues.filter((issue) => {
    const matchStatus = filterStatus === 'all' || issue.status === filterStatus;
    const matchSearch =
      !searchQuery ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts: Record<string, number> = { all: issues.length };
  ALL_STATUSES.slice(1).forEach((s) => {
    counts[s] = issues.filter((i) => i.status === s).length;
  });

  return (
    <AdminLayout>
      <div style={{ padding: 32 }}>
        {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', margin: 0, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                    PROJECT ISSUES
                  </h1>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,49,49,0.15)', color: 'var(--brand-red)' }}>
                    VOICE &amp; DOC SYNC
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Track and manage project issues using AI voice or natural language text commands
                </p>
              </div>

              <button
                onClick={() => {
                  if (!docConnected) {
                    toast.error('Connect a Google Doc first');
                    return;
                  }
                  setPanelOpen(!panelOpen);
                  setPreview(null);
                  setError('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: panelOpen ? '#4f46e5' : 'var(--brand-red)',
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {panelOpen ? <X size={14} /> : <Sparkles size={14} />}
                {panelOpen ? 'Close Voice / Text' : 'AI Voice / Text Command'}
              </button>
            </div>

            {/* Google Doc Connection Container */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '18px 20px',
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
                Google Doc Connection
              </div>

              {docConnected ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        background: 'rgba(66, 133, 244, 0.15)',
                        border: '1px solid rgba(66, 133, 244, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText size={18} color="#4285f4" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {savedDocs.find((d) => d.id === docId)?.name || 'Connected Google Doc'}
                        </span>
                        <span
                          style={{
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: '#22c55e',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 99,
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Check size={11} strokeWidth={2.5} /> Connected
                        </span>
                      </div>
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 11.5, color: '#4285f4', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}
                      >
                        Open in Google Docs <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
                    <button
                      onClick={() => fetchIssues(docId)}
                      disabled={fetching}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCw size={13} className={fetching ? 'animate-spin' : ''} />
                      {fetching ? 'Syncing…' : 'Refresh'}
                    </button>

                    {savedDocs.length > 1 && (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setShowDropdown(!showDropdown)}
                          style={{
                            padding: '7px 14px',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            color: 'var(--text-primary)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Switch Project ▾
                        </button>
                        {showDropdown && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              marginTop: 4,
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              zIndex: 100,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                              minWidth: 220,
                              overflow: 'hidden',
                            }}
                          >
                            <p style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: 0 }}>
                              Saved Documents
                            </p>
                            {savedDocs.map((doc) => (
                              <div
                                key={doc.id}
                                onClick={() => {
                                  setDocId(doc.id);
                                  setDocUrl(doc.url);
                                  setShowDropdown(false);
                                  fetchIssues(doc.id);
                                }}
                                style={{
                                  padding: '10px 14px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  background: doc.id === docId ? 'rgba(255,49,49,0.1)' : 'transparent',
                                  borderLeft: doc.id === docId ? '3px solid var(--brand-red)' : '3px solid transparent',
                                }}
                              >
                                <span style={{ fontSize: 12.5, fontWeight: doc.id === docId ? 700 : 400, color: 'var(--text-primary)' }}>
                                  {doc.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setDocConnected(false);
                        setDocId('');
                        setDocUrl('');
                        setUrlInput('');
                      }}
                      style={{
                        padding: '7px 14px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        color: 'var(--text-muted)',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Change URL
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                    Paste your Google Doc URL to load live project issues and activate voice commands:
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="https://docs.google.com/document/d/..."
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        setUrlError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && connectDoc()}
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        color: 'var(--text-primary)',
                        fontSize: 12.5,
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={connectDoc}
                      disabled={!urlInput.trim()}
                      style={{
                        padding: '9px 20px',
                        borderRadius: 6,
                        border: 'none',
                        background: !urlInput.trim() ? 'var(--border)' : '#4285f4',
                        color: '#fff',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: !urlInput.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Connect
                    </button>
                  </div>
                  {urlError && (
                    <p style={{ color: '#ef4444', fontSize: 12, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <AlertCircle size={12} /> {urlError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Voice Command Panel */}
            {panelOpen && (
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 20,
                  marginBottom: 24,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Natural Language &amp; Speech Interface
                </div>

                {!preview && (
                  <>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder={isListening ? 'Listening… speak your command now' : 'e.g. "Create issue for navbar login bug" or "Resolve issue 4"'}
                        value={isListening && transcript ? transcript : text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        autoFocus
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          background: 'var(--bg-primary)',
                          border: `1px solid ${isListening ? '#818cf8' : 'var(--border)'}`,
                          borderRadius: 6,
                          color: 'var(--text-primary)',
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={toggleListening}
                        title={isListening ? 'Stop listening' : 'Start voice recognition'}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 6,
                          border: `1px solid ${isListening ? '#818cf8' : 'var(--border)'}`,
                          background: isListening ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-primary)',
                          color: isListening ? '#818cf8' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        {isListening ? <Mic size={18} /> : <MicOff size={18} />}
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={loading || !text.trim()}
                        style={{
                          padding: '10px 20px',
                          borderRadius: 6,
                          border: 'none',
                          background: loading || !text.trim() ? 'var(--border)' : 'var(--brand-red)',
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Execute
                      </button>
                    </div>

                    {isListening && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, color: '#818cf8', fontSize: 11.5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                        Listening actively… Speak naturally into microphone
                      </div>
                    )}
                  </>
                )}

                {preview && (
                  <div
                    style={{
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: 6,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#818cf8', marginBottom: 12 }}>
                      {preview.confirmation_message}
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setPreview(null)}
                        style={{
                          padding: '7px 14px',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          color: 'var(--text-muted)',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirm}
                        disabled={loading}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 16px',
                          background: '#818cf8',
                          border: 'none',
                          borderRadius: 6,
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Confirm Action
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <p style={{ color: '#ef4444', fontSize: 12, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <AlertCircle size={12} /> {error}
                  </p>
                )}
              </div>
            )}

            {/* Status Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
              {ALL_STATUSES.map((s) => {
                const cfg = STATUS_CONFIG[s] || { label: 'All Issues', color: 'var(--brand-red)' };
                const isSelected = filterStatus === s;
                return (
                  <div
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: `1px solid ${isSelected ? cfg.color : 'var(--border)'}`,
                      borderRadius: 8,
                      padding: '16px 18px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                      {counts[s] || 0}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{cfg.label}</div>
                    <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: cfg.color, width: '40%' }} />
                  </div>
                );
              })}
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                <Search
                  size={14}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
                />
                <input
                  type="text"
                  placeholder="Search issues by keyword, title, or status…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text-primary)',
                    fontSize: 12.5,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ALL_STATUSES.map((s) => {
                  const isSelected = filterStatus === s;
                  const cfg = STATUS_CONFIG[s] || { label: 'All', color: 'var(--brand-red)' };
                  return (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: isSelected ? cfg.color : 'var(--border)',
                        background: isSelected ? cfg.bg || 'rgba(255,49,49,0.15)' : 'var(--bg-secondary)',
                        color: isSelected ? cfg.color : 'var(--text-muted)',
                      }}
                    >
                      {cfg.label} ({counts[s] || 0})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Issues List */}
            {fetching ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Loader2 size={16} className="animate-spin" /> Fetching issues from document…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '60px 20px', textAlign: 'center' }}>
                <AlertCircle size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                  {!docConnected
                    ? 'Connect a Google Doc URL above to inspect and manage project issues'
                    : searchQuery
                    ? `No issues matching "${searchQuery}"`
                    : 'No issues found in the connected document.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map((issue) => {
                  const sc = STATUS_CONFIG[issue.status] || STATUS_CONFIG.open;
                  const pc = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG.medium;
                  return (
                    <div
                      key={issue.number}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 16,
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 6,
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: 12,
                          fontWeight: 800,
                          color: 'var(--text-muted)',
                          fontFamily: 'monospace',
                        }}
                      >
                        #{issue.number}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                          {issue.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: sc.bg,
                              color: sc.color,
                              border: `1px solid ${sc.color}30`,
                            }}
                          >
                            {sc.label}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: pc.bg,
                              color: pc.color,
                              border: `1px solid ${pc.color}30`,
                            }}
                          >
                            {pc.label} Priority
                          </span>
                          {issue.created && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={11} /> {issue.created}
                            </span>
                          )}
                        </div>
                      </div>

                      {docUrl && (
                        <a
                          href={docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 11.5,
                            color: '#4285f4',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 10px',
                            background: 'rgba(66, 133, 244, 0.1)',
                            borderRadius: 6,
                            flexShrink: 0,
                          }}
                        >
                          <ExternalLink size={11} /> Open In Doc
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
    </AdminLayout>
  );
}
