import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, 'canManageInvoices');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  const { id } = await params;
  try {
    const invoiceRef = adminDb.collection('invoices').doc(id);
    const invoiceSnap = await invoiceRef.get();
    
    if (!invoiceSnap.exists) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const updateData = {
      status: 'PAID',
      paidAt: new Date().toISOString(),
      paidBy: auth.uid,
    };
    await invoiceRef.update(updateData);
    
    const batch = adminDb.batch();
    batch.set(adminDb.collection('auditLogs').doc(), {
      actorId: auth.uid,
      actorRole: auth.role,
      action: 'INVOICE_PAID',
      entityType: 'INVOICE',
      entityId: id,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS'
    });

    batch.set(adminDb.collection('integrationEvents').doc(), {
      eventType: 'INVOICE_PAID',
      entityId: id,
      source: 'CENTRAL_ADMIN',
      timestamp: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0
    });

    await batch.commit();

    return NextResponse.json({ success: true, ...updateData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
