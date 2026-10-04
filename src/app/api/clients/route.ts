import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'canManageClients');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const snap = await adminDb.collection('clients').orderBy('createdAt', 'desc').get();
    const clients = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ clients });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'canManageClients');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const data = await req.json();
    const clientRef = adminDb.collection('clients').doc();
    const newClient = {
      ...data,
      createdAt: new Date().toISOString(),
      createdBy: auth.uid,
    };
    await clientRef.set(newClient);
    
    await adminDb.collection('auditLogs').add({
      actorId: auth.uid,
      actorRole: auth.role,
      action: 'CLIENT_CREATED',
      entityType: 'CLIENT',
      entityId: clientRef.id,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS'
    });
    
    return NextResponse.json({ id: clientRef.id, ...newClient });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
