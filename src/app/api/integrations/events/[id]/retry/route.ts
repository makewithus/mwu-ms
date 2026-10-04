import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, 'canManageProjects');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  const { id } = await params;
  try {
    const eventRef = adminDb.collection('integrationEvents').doc(id);
    const eventSnap = await eventRef.get();
    
    if (!eventSnap.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventData = eventSnap.data();
    if (eventData?.status !== 'FAILED') {
      return NextResponse.json({ error: 'Only failed events can be retried' }, { status: 400 });
    }

    await eventRef.update({
      status: 'PENDING',
      retryCount: (eventData.retryCount || 0) + 1,
      lastError: null,
    });

    await adminDb.collection('auditLogs').add({
      actorId: auth.uid,
      actorRole: auth.role,
      action: 'INTEGRATION_EVENT_RETRY',
      entityType: 'INTEGRATION_EVENT',
      entityId: id,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS'
    });

    return NextResponse.json({ success: true, message: 'Event queued for retry' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
