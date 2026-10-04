import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'canManageProjects'); // Requires valid admin role
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const clientsSnap = await adminDb.collection('clients').count().get();
    const employeesSnap = await adminDb.collection('employees').count().get();
    const projectsSnap = await adminDb.collection('projects').count().get();
    const integrationsSnap = await adminDb.collection('integrationEvents').where('status', '==', 'PENDING').count().get();

    // Recent activity (e.g. audit logs)
    const activitySnap = await adminDb.collection('auditLogs')
      .orderBy('timestamp', 'desc')
      .limit(4)
      .get();
      
    const activity = activitySnap.docs.map(doc => {
      const data = doc.data();
      let color = 'var(--text-muted)';
      if (data.result === 'SUCCESS') color = 'var(--accent-green)';
      if (data.result === 'FAILED') color = 'var(--brand-red)';
      if (data.status === 'PENDING') color = 'var(--accent-amber)';
      
      return {
        title: data.action || 'Unknown Event',
        status: data.result || 'UNKNOWN',
        color,
        id: doc.id
      };
    });

    return NextResponse.json({
      stats: {
        clients: clientsSnap.data().count,
        employees: employeesSnap.data().count,
        projects: projectsSnap.data().count,
        integrations: integrationsSnap.data().count,
      },
      activity
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
