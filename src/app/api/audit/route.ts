import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'canManageEmployees'); 
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const snap = await adminDb.collection('auditLogs')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
      
    const logs = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
