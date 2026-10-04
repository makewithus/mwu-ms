import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/auth/session';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/clients',
  '/employees',
  '/projects',
  '/invoices',
  '/integrations',
  '/unauthorized',
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);

  if (isProtectedPath(pathname) && !hasSession) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === '/' || pathname === '/login') && hasSession) {
    const dashboardUrl = req.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/dashboard/:path*', '/clients/:path*', '/employees/:path*', '/projects/:path*', '/invoices/:path*', '/integrations/:path*', '/unauthorized'],
};
