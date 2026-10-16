import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROGRESS_MAP: Record<string, number> = {
  Pending: 0,
  'In Progress': 40,
  Review: 80,
  Completed: 100,
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, 'canManageTasks');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  const { id } = await params;
  try {
    const doc = await adminDb.collection('tasks').doc(id).get();
    if (!doc.exists) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json({ task: { id: doc.id, ...doc.data() } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, 'canManageTasks');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  const { id } = await params;
  try {
    const data = await req.json();
    const taskRef = adminDb.collection('tasks').doc(id);
    const existing = await taskRef.get();
    if (!existing.exists) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const existingData = existing.data() || {};
    const updateData: Record<string, any> = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    if (data.status && data.progress === undefined) {
      updateData.progress = PROGRESS_MAP[data.status] ?? existingData.progress ?? 0;
    }

    await taskRef.update(updateData);

    // Write audit log
    await adminDb.collection('auditLogs').add({
      actorId: auth.uid,
      actorRole: auth.role,
      action: 'TASK_UPDATED',
      entityType: 'TASK',
      entityId: id,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS',
      details: {
        previousStatus: existingData.status,
        newStatus: updateData.status || existingData.status,
        taskTitle: existingData.title,
      }
    }).catch(() => {});

    return NextResponse.json({ id, ...existingData, ...updateData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, 'canManageTasks');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  const { id } = await params;
  try {
    const taskRef = adminDb.collection('tasks').doc(id);
    const existing = await taskRef.get();
    if (!existing.exists) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const existingData = existing.data() || {};
    await taskRef.delete();

    // Write audit log
    await adminDb.collection('auditLogs').add({
      actorId: auth.uid,
      actorRole: auth.role,
      action: 'TASK_DELETED',
      entityType: 'TASK',
      entityId: id,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS',
      details: { taskTitle: existingData.title }
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
