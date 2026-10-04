import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(req, 'canManageProjects');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const data = await req.json();
    const ref = adminDb.collection('projects').doc(id);
    
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.uid,
    };
    
    await ref.update(updateData);
    
    await adminDb.collection('auditLogs').add({
      actorId: auth.uid,
      actorRole: auth.role,
      action: 'PROJECT_UPDATED',
      entityType: 'PROJECT',
      entityId: id,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS'
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(req, 'canManageProjects');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    await adminDb.collection('projects').doc(id).delete();
    
    await adminDb.collection('auditLogs').add({
      actorId: auth.uid,
      actorRole: auth.role,
      action: 'PROJECT_DELETED',
      entityType: 'PROJECT',
      entityId: id,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS'
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
