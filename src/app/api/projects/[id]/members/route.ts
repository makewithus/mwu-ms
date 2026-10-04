import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, 'canManageProjects');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });
  
  const { id } = await params;

  try {
    const snap = await adminDb.collection('projectMembers').where('projectId', '==', id).get();
    const members = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ members });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, 'canManageProjects');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  const { id } = await params;
  try {
    const { employeeId, role = 'MEMBER' } = await req.json();
    
    const existing = await adminDb.collection('projectMembers')
      .where('projectId', '==', id)
      .where('employeeId', '==', employeeId)
      .where('status', '==', 'ACTIVE')
      .get();
      
    if (!existing.empty) {
      return NextResponse.json({ message: 'Employee is already active on this project' }, { status: 400 });
    }

    const memberRef = adminDb.collection('projectMembers').doc();
    const newMember = {
      projectId: id,
      employeeId,
      role,
      status: 'ACTIVE',
      assignedAt: new Date().toISOString(),
      assignedBy: auth.uid,
    };
    await memberRef.set(newMember);

    const batch = adminDb.batch();
    
    batch.set(adminDb.collection('auditLogs').doc(), {
      actorId: auth.uid,
      actorRole: auth.role,
      action: 'PROJECT_MEMBER_ADDED',
      entityType: 'PROJECT_MEMBER',
      entityId: memberRef.id,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS'
    });

    batch.set(adminDb.collection('integrationEvents').doc(), {
      eventType: 'PROJECT_MEMBER_ADDED',
      entityId: memberRef.id,
      source: 'CENTRAL_ADMIN',
      timestamp: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0
    });

    await batch.commit();

    return NextResponse.json({ id: memberRef.id, ...newMember });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
