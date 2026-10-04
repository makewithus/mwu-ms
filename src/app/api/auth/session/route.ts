import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { normalizeRole } from '@/lib/auth/rbac';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clearSession(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken || typeof idToken !== 'string') {
      return clearSession(NextResponse.json({ error: 'Missing Firebase ID token' }, { status: 400 }));
    }

    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const role = normalizeRole(userDoc.data()?.role);

    if (!userDoc.exists || (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'MANAGER')) {
      return clearSession(NextResponse.json({ error: 'Central admin access is required' }, { status: 403 }));
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error('Failed to create admin session:', error);
    return clearSession(NextResponse.json({ error: 'Failed to create secure admin session' }, { status: 401 }));
  }
}

export async function DELETE() {
  return clearSession(NextResponse.json({ ok: true }));
}
