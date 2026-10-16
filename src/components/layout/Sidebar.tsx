'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  ChevronLeft,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Settings,
  FileText,
  ListTodo,
  Clock,
  CalendarDays,
  FolderOpen,
  Megaphone,
  Bell,
  AlertCircle,
  Crown,
  Coins,
  Sliders,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission } from '@/lib/auth/rbac';

interface NavSection {
  title?: string;
  items: {
    href: string;
    label: string;
    icon: any;
    permission?: string;
  }[];
}

const SECTIONS: NavSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { href: '/clients', label: 'Clients', icon: Users },
      { href: '/projects', label: 'Projects', icon: ClipboardList },
      { href: '/invoices', label: 'Invoices', icon: DollarSign },
    ],
  },
  {
    title: 'EMS MANAGEMENT',
    items: [
      { href: '/employees', label: 'Employees', icon: ShieldCheck },
      { href: '/tasks', label: 'Tasks', icon: ListTodo },
      { href: '/attendance', label: 'Attendance', icon: Clock },
      { href: '/leaves', label: 'Leaves', icon: CalendarDays },
      { href: '/payroll', label: 'Payroll', icon: Coins },
      { href: '/documents', label: 'Documents', icon: FolderOpen },
      { href: '/notices', label: 'Notices', icon: Megaphone },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/notifications', label: 'Notifications', icon: Bell },
      { href: '/settings', label: 'Settings', icon: Sliders },
      { href: '/issues', label: 'Issues', icon: AlertCircle },
      { href: '/employer', label: 'Employer', icon: Crown },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { href: '/audit', label: 'Audit Logs', icon: FileText },
      { href: '/system-users', label: 'System Users', icon: Settings, permission: 'canManageSystemUsers' },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { userData } = useAuth();

  const linkStyle = (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: open ? '10px 16px' : '10px 0',
    justifyContent: open ? ('flex-start' as const) : ('center' as const),
    marginBottom: 2,
    textDecoration: 'none',
    color: active ? '#fff' : 'var(--text-inverse)',
    background: active ? 'var(--brand-red)' : 'transparent',
    fontSize: 12.5,
    fontWeight: active ? 600 : 500,
    transition: 'background 0.12s, color 0.12s, padding 0.18s cubic-bezier(0.4,0,0.2,1)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    border: active ? 'none' : '1px solid transparent',
    borderRadius: 4,
  });

  return (
    <aside
      style={{
        width: open ? 260 : 84,
        minWidth: open ? 260 : 84,
        background: 'var(--bg-dark)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.18s cubic-bezier(0.4,0,0.2,1), min-width 0.18s cubic-bezier(0.4,0,0.2,1)',
        willChange: 'width',
        overflow: 'hidden',
        height: '100vh',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            opacity: open ? 1 : 0,
            transform: open ? 'translateX(0)' : 'translateX(-15px)',
            transition: 'opacity 0.18s cubic-bezier(0.4,0,0.2,1), transform 0.18s cubic-bezier(0.4,0,0.2,1)',
            pointerEvents: open ? 'auto' : 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <Image src="/logo.png" alt="MakeWithUs" width={140} height={28} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        </div>

        <button
          onClick={onToggle}
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
          style={{
            position: 'absolute',
            right: open ? 20 : 28,
            top: 22,
            width: 28,
            height: 28,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'right 0.18s cubic-bezier(0.4,0,0.2,1), color 0.15s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-inverse)'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <ChevronLeft size={18} style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)' }} />
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '20px 12px', overflowY: 'auto', overflowX: 'hidden' }}>
        {SECTIONS.map((section, idx) => {
          const visibleItems = section.items.filter((item) => {
            if (item.permission && !hasPermission(userData?.role, item.permission as any)) {
              return false;
            }
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} style={{ marginBottom: 16 }}>
              {open && section.title && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                    padding: '8px 16px 4px',
                    textTransform: 'uppercase',
                  }}
                >
                  {section.title}
                </div>
              )}
              {visibleItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (pathname.startsWith(href) && href !== '/dashboard');
                return (
                  <Link
                    key={href}
                    href={href}
                    title={!open ? label : undefined}
                    style={linkStyle(active)}
                    onMouseOver={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(255,49,49,0.12)';
                        e.currentTarget.style.color = '#fff';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-inverse)';
                      }
                    }}
                  >
                    <Icon size={17} strokeWidth={active ? 2.5 : 1.6} style={{ minWidth: 17, flexShrink: 0 }} />
                    <span
                      style={{
                        opacity: open ? 1 : 0,
                        maxWidth: open ? 200 : 0,
                        transition: 'opacity 0.13s ease, max-width 0.18s cubic-bezier(0.4,0,0.2,1)',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
