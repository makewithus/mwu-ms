import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'canManageTasks');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    let queryRef: FirebaseFirestore.Query = adminDb.collection('tasks');
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const assigneeId = searchParams.get('assigneeId');

    if (status && status !== 'ALL') {
      queryRef = queryRef.where('status', '==', status);
    }
    if (assigneeId) {
      queryRef = queryRef.where('assigneeId', '==', assigneeId);
    }

    const snap = await queryRef.orderBy('createdAt', 'desc').get().catch(async () => {
      // Fallback if composite index is pending
      return await adminDb.collection('tasks').get();
    });

    const tasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ tasks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'canManageTasks');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const data = await req.json();
    const taskRef = adminDb.collection('tasks').doc();

    const taskData = {
      title: (data.title || '').trim(),
      desc: (data.desc || '').trim(),
      deadline: data.deadline || '',
      priority: data.priority || 'Medium',
      status: data.status || 'Pending',
      progress: data.progress ?? 0,
      assigneeId: data.assigneeId || '',
      assigneeName: data.assigneeName || 'Unassigned',
      assignedTo: data.assigneeId || '',
      companyId: data.companyId || 'default',
      createdBy: auth.role === 'SUPER_ADMIN' ? 'Central Admin' : (data.createdBy || 'Central Manager'),
      createdByUid: auth.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await taskRef.set(taskData);

    // Notify assignee in notifications collection if assigned
    if (taskData.assigneeId) {
      await adminDb.collection('notifications').add({
        companyId: taskData.companyId,
        userId: taskData.assigneeId,
        title: 'New Task Assigned',
        message: `Task assigned by ${taskData.createdBy}: "${taskData.title}"`,
        type: 'task',
        isRead: false,
        link: '/tasks',
        createdAt: new Date().toISOString(),
      }).catch(() => {});
    }

    // Write audit log
    await adminDb.collection('auditLogs').add({
      actorId: auth.uid,
      actorRole: auth.role,
      action: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: taskRef.id,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS',
      details: { title: taskData.title, assigneeName: taskData.assigneeName }
    }).catch(() => {});

    return NextResponse.json({ id: taskRef.id, ...taskData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
