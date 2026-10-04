import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'canManageInvoices');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const snap = await adminDb.collection('invoices').orderBy('createdAt', 'desc').get();
    const invoices = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ invoices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'canManageInvoices');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const data = await req.json();
    const invoiceRef = adminDb.collection('invoices').doc();
    const newInvoice = {
      ...data,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      createdBy: auth.uid,
    };
    await invoiceRef.set(newInvoice);
    
    await adminDb.collection('auditLogs').add({
      actorId: auth.uid,
      actorRole: auth.role,
      action: 'INVOICE_CREATED',
      entityType: 'INVOICE',
      entityId: invoiceRef.id,
      timestamp: new Date().toISOString(),
      result: 'SUCCESS'
    });

    await adminDb.collection('integrationEvents').add({
      eventType: 'INVOICE_CREATED',
      entityId: invoiceRef.id,
      source: 'CENTRAL_ADMIN',
      timestamp: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0
    });

    return NextResponse.json({ id: invoiceRef.id, ...newInvoice });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
