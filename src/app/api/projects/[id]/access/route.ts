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
    const { clientId } = await req.json();

    const accessRef = adminDb.collection('clientProjectAccess').doc();
    const accessRecord = {
      projectId: id,
      clientId,
      status: 'GRANTED',
      grantedAt: new Date().toISOString(),
      grantedBy: auth.uid,
    };
    
    await accessRef.set(accessRecord);

    const batch = adminDb.batch();
    batch.set(adminDb.collection('auditLogs').doc(), {
      actorId: auth.uid,
      actorRole: auth.role,
      action: 'CLIENT_PROJECT_ACCESS_GRANTED',
      entityType: 'CLIENT_PROJECT_ACCESS',
      entityId: accessRef.id,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS'
    });

    batch.set(adminDb.collection('integrationEvents').doc(), {
      eventType: 'CLIENT_PROJECT_ACCESS_GRANTED',
      entityId: accessRef.id,
      source: 'CENTRAL_ADMIN',
      timestamp: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0
    });

    await batch.commit();

    return NextResponse.json({ id: accessRef.id, ...accessRecord });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
