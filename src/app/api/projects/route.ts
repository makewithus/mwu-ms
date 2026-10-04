import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'canManageProjects');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const snap = await adminDb.collection('projects').orderBy('createdAt', 'desc').get();
    const projects = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ projects });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'canManageProjects');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const data = await req.json();
    const projRef = adminDb.collection('projects').doc();
    const newProject = {
      ...data,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      createdBy: auth.uid,
    };
    await projRef.set(newProject);
    
    await adminDb.collection('auditLogs').add({
      actorId: auth.uid,
      actorRole: auth.role,
      action: 'PROJECT_CREATED',
      entityType: 'PROJECT',
      entityId: projRef.id,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS'
    });

    return NextResponse.json({ id: projRef.id, ...newProject });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
