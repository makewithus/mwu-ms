import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'canManageEmployees');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const snap = await adminDb.collection('employees').orderBy('createdAt', 'desc').get();
    const employees = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ employees });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'canManageEmployees');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const data = await req.json();
    const empRef = adminDb.collection('employees').doc();
    const newEmployee = {
      ...data,
      createdAt: new Date().toISOString(),
      createdBy: auth.uid,
    };
    await empRef.set(newEmployee);
    
    await adminDb.collection('auditLogs').add({
      actorId: auth.uid,
      actorRole: auth.role,
      action: 'EMPLOYEE_CREATED',
      entityType: 'EMPLOYEE',
      entityId: empRef.id,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS'
    });

    return NextResponse.json({ id: empRef.id, ...newEmployee });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
