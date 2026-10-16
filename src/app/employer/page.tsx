'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { toast } from '@/components/ui/Toast';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  Crown,
  Briefcase,
  Mail,
  Phone,
  Globe,
  Award,
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  MessageSquare,
  X,
  Loader2,
  BarChart3,
  CheckCircle2,
  Zap,
  Star,
  ArrowUpRight,
  Activity,
  Layers,
  Clock,
  ShieldCheck,
  Send,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type Member = {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  linkedin: string;
  bio: string;
  since: string;
  initials: string;
  accentColor: string;
  highlights: string[];
};

type KPI = {
  label: string;
  value: string;
  sub: string;
  icon: any;
  color: string;
  trend?: string;
};

/* ─────────────────────────────────────────────
   Leadership Data
───────────────────────────────────────────── */
const MEMBERS: Member[] = [
  {
    id: 'sudarsanan',
    name: 'Sudarsanan',
    title: 'Managing Director (MD)',
    department: 'Executive Leadership',
    email: 'sudarsanan@makewithus.in',
    phone: '+91 62387 19566',
    linkedin: 'https://www.linkedin.com/in/sudarsanan2004/',
    bio: 'Visionary leader responsible for managing company operations, employee performance, project execution, and internal product development. Oversees organizational growth, resource planning, and ensures successful delivery of client and company-owned products.',
    since: '2024',
    initials: 'SD',
    accentColor: 'var(--brand-red)',
    highlights: [
      'Employee management & team coordination',
      'Project planning, tracking & delivery',
      'Internal product development & innovation',
      'Process optimization & operational efficiency',
      'Client project execution oversight',
      'Resource allocation & workflow management',
    ],
  },
  {
    id: 'sherhan',
    name: 'Sherhan',
    title: 'Chief Executive Officer (CEO)',
    department: 'Executive Leadership',
    email: 'mosherhan@makewithus.in',
    phone: '+91 88385 14202',
    linkedin: 'https://www.linkedin.com/in/mosherhan',
    bio: 'Creative and strategic leader responsible for driving company vision, business growth, innovation, and design excellence. Focuses on identifying opportunities, shaping company direction, and developing ideas that strengthen the Make With Us brand.',
    since: '2024',
    initials: 'SH',
    accentColor: '#3b82f6',
    highlights: [
      'Company vision & strategic planning',
      'Business growth & expansion initiatives',
      'Idea generation & innovation leadership',
      'Product conceptualization',
      'Design direction & creative oversight',
      'Brand development & market positioning',
    ],
  },
];

/* ─────────────────────────────────────────────
   Contact Modal
───────────────────────────────────────────── */
function ContactModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const [msg, setMsg] = useState('');
  const [senderName, setSenderName] = useState('Central Admin');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!msg.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    setSending(true);
    try {
      // Dispatches real-time notification to executive
      await addDoc(collection(db, 'notifications'), {
        title: `Message from Central Admin (${senderName})`,
        message: msg.trim(),
        type: 'general',
        targetEmail: member.email,
        targetName: member.name,
        isRead: false,
        createdAt: serverTimestamp(),
      });
      toast.success(`Message transmitted to ${member.name}!`);
      onClose();
    } catch (err: any) {
      toast.error('Failed to dispatch notification: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 24,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: `${member.accentColor}20`,
                border: `2px solid ${member.accentColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 800,
                color: member.accentColor,
              }}
            >
              {member.initials}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Dispatch Direct Message</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>To: {member.name} ({member.title})</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Sender Attribution
          </label>
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 12.5,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Message Content
          </label>
          <textarea
            rows={5}
            placeholder={`Type your communication to ${member.name}…`}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 12.5,
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              padding: '9px 16px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !msg.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              background: member.accentColor,
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: sending || !msg.trim() ? 'not-allowed' : 'pointer',
              opacity: sending || !msg.trim() ? 0.6 : 1,
            }}
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {sending ? 'Dispatching…' : 'Dispatch Message'}
          </button>
        </div>
      </div>
    </div>
  );
}

const LinkedinIcon = ({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

/* ─────────────────────────────────────────────
   Member Card
───────────────────────────────────────────── */
function MemberCard({ member }: { member: Member }) {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      {contactOpen && <ContactModal member={member} onClose={() => setContactOpen(false)} />}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = member.accentColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        {/* Top color bar */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${member.accentColor}, ${member.accentColor}80)` }} />

        <div style={{ padding: '24px 26px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${member.accentColor}25, ${member.accentColor}08)`,
                border: `2px solid ${member.accentColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 800,
                color: member.accentColor,
                flexShrink: 0,
                boxShadow: `0 0 0 4px ${member.accentColor}15`,
              }}
            >
              {member.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {member.name}
                </span>
                <Crown size={14} color={member.accentColor} />
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: member.accentColor,
                  background: `${member.accentColor}15`,
                  padding: '2px 8px',
                  borderRadius: 4,
                  marginBottom: 6,
                }}
              >
                {member.title}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Briefcase size={11} /> {member.department} · Established {member.since}
              </div>
            </div>
          </div>

          {/* Bio statement */}
          <p
            style={{
              fontSize: 12.5,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: 18,
              padding: '12px 14px',
              background: 'var(--bg-primary)',
              borderRadius: 6,
              borderLeft: `3px solid ${member.accentColor}`,
            }}
          >
            {member.bio}
          </p>

          {/* Responsibilities */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
              Core Responsibilities & Strategic Oversight
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px 12px' }}>
              {member.highlights.map((h) => (
                <div key={h} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11.5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: member.accentColor, flexShrink: 0, marginTop: 5 }} />
                  <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Details */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
              Direct Channels
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: Mail, value: member.email, href: `mailto:${member.email}` },
                { icon: Phone, value: member.phone, href: `tel:${member.phone}` },
                { icon: LinkedinIcon, value: member.linkedin, href: member.linkedin },
              ].map(({ icon: Icon, value, href }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 11.5,
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    padding: '5px 8px',
                    borderRadius: 4,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = `${member.accentColor}15`;
                    e.currentTarget.style.color = member.accentColor;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <Icon size={12} color="var(--text-muted)" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                  <ArrowUpRight size={10} style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.5 }} />
                </a>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <button
              onClick={() => setContactOpen(true)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '9px 14px',
                background: member.accentColor,
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <MessageSquare size={13} /> Send Message
            </button>
            <a
              href={`mailto:${member.email}`}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '9px 14px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Mail size={13} /> Email Direct
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Main Employer Page
───────────────────────────────────────────── */
export default function EmployerPage() {
  const [totalEmployees, setTotalEmployees] = useState<number>(0);
  const [activeClients, setActiveClients] = useState<number>(3);

  useEffect(() => {
    const unsubEmp = onSnapshot(collection(db, 'employees'), (snap) => {
      setTotalEmployees(snap.docs.length);
    });
    const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
      if (snap.docs.length > 0) setActiveClients(snap.docs.length);
    });
    return () => {
      unsubEmp();
      unsubClients();
    };
  }, []);

  const ORG_STATS = [
    { label: 'Founded', value: '2024', icon: Building2, color: 'var(--brand-red)' },
    { label: 'Total Workforce', value: totalEmployees > 0 ? `${totalEmployees} Employees` : 'Growing Team', icon: Users, color: '#3b82f6' },
    { label: 'Revenue Model', value: 'B2B / B2C Software', icon: TrendingUp, color: '#22c55e' },
    { label: 'Payroll Operations', value: 'Central & In-House', icon: DollarSign, color: '#a855f7' },
  ];

  const KPIS: KPI[] = [
    {
      label: 'Projects Delivered',
      value: '26+',
      sub: 'Across client & internal builds',
      icon: CheckCircle2,
      color: '#22c55e',
      trend: '+14 milestones hit',
    },
    {
      label: 'Active Clients',
      value: activeClients.toString(),
      sub: 'Enterprise & agency engagements',
      icon: Star,
      color: '#f59e0b',
      trend: 'Expanding portfolio',
    },
    {
      label: 'Team Utilisation',
      value: '94%',
      sub: 'Cross-functional engineering avg',
      icon: Activity,
      color: '#3b82f6',
      trend: '↑ 6% this quarter',
    },
    {
      label: 'Avg. Delivery Turnaround',
      value: '2–5 days',
      sub: 'Agile sprint delivery benchmark',
      icon: Clock,
      color: '#a855f7',
      trend: 'High velocity cadence',
    },
    {
      label: 'Pipeline Products',
      value: '5',
      sub: 'Proprietary platforms & tools',
      icon: Layers,
      color: 'var(--brand-red)',
      trend: '2 shipping this month',
    },
    {
      label: 'Client Satisfaction',
      value: '4.8 / 5.0',
      sub: 'Cumulative quality index',
      icon: ShieldCheck,
      color: '#06b6d4',
      trend: 'Consistent top tier',
    },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: 32 }}>
        {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', margin: 0, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                    ORGANIZATION &amp; EMPLOYER
                  </h1>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,49,49,0.15)', color: 'var(--brand-red)' }}>
                    GOVERNANCE
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Executive leadership directory, organizational KPIs, and strategic vision
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                <Building2 size={14} color="var(--brand-red)" />
                makewithus Pvt Ltd
              </div>
            </div>

            {/* Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 28 }}>
              {ORG_STATS.map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: `${s.color}15`,
                      border: `1px solid ${s.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <s.icon size={18} color={s.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Executive Leadership Team */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Crown size={16} color="var(--brand-red)" />
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
                Executive Leadership Team
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 32 }}>
              {MEMBERS.map((m) => (
                <MemberCard key={m.id} member={m} />
              ))}
            </div>

            {/* Company KPIs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <BarChart3 size={16} color="var(--brand-red)" />
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
                Organizational Performance &amp; Metrics
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4 }}>
                FY 2024–26
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 32 }}>
              {KPIS.map((k) => (
                <div
                  key={k.label}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        background: `${k.color}15`,
                        border: `1px solid ${k.color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <k.icon size={17} color={k.color} />
                    </div>
                    {k.trend && (
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: k.color,
                          background: `${k.color}15`,
                          padding: '2px 8px',
                          borderRadius: 99,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Zap size={9} /> {k.trend}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1 }}>
                      {k.value}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{k.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{k.sub}</div>
                  </div>

                  <div style={{ height: 2, borderRadius: 99, background: `linear-gradient(90deg, ${k.color}80, transparent)`, marginTop: 'auto' }} />
                </div>
              ))}
            </div>

            {/* Vision & Mission */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Target size={16} color="var(--brand-red)" />
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
                Vision, Mission &amp; Principles
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 24,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                {[
                  {
                    icon: Award,
                    title: 'Vision',
                    color: 'var(--brand-red)',
                    desc: 'To be the most trusted software and product partner for companies seeking breakthrough growth, building durable engineering impact across tech ecosystems.',
                  },
                  {
                    icon: Target,
                    title: 'Mission',
                    color: '#3b82f6',
                    desc: 'Empowering teams through ultra-lean tools, transparent workflows, high-cadence shipping, and people-first leadership that unlocks every talent.',
                  },
                  {
                    icon: Globe,
                    title: 'Core Values',
                    color: '#22c55e',
                    desc: 'Speed, Integrity, Ownership, and Brutal Craftsmanship — the four pillars that guide every decision from executive governance to deployment.',
                  },
                ].map((v) => (
                  <div
                    key={v.title}
                    style={{
                      padding: 18,
                      background: 'var(--bg-primary)',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      borderTop: `3px solid ${v.color}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <v.icon size={15} color={v.color} />
                      <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                        {v.title}
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      {v.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
    </AdminLayout>
  );
}
