import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // Generate unique INV-XXXX ID
    const latestSnap = await adminDb.collection('invoices').orderBy('invoiceNumber', 'desc').limit(1).get();
    let nextNumber = 1001;
    if (!latestSnap.empty) {
      const latestData = latestSnap.docs[0].data();
      if (latestData.invoiceNumber) {
        nextNumber = latestData.invoiceNumber + 1;
      }
    }
    const customId = `INV-${nextNumber.toString().padStart(4, '0')}`;
    const invoiceRef = adminDb.collection('invoices').doc(customId);
    
    const newInvoice = {
      clientId: data.clientId,
      projectId: data.projectId,
      amount: data.amount,
      status: data.status || 'UNPAID',
      invoiceNumber: nextNumber,
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

export async function PUT(req: NextRequest) {
  // Wait, the client uses PUT, let's keep it PUT or PATCH
  return PATCH(req);
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission(req, 'canManageInvoices');
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

  try {
    const data = await req.json();
    // Support either passing ID in body or using dynamic route (but it's in the body currently in invoices/page.tsx? No, it's PUT /api/invoices/[id])
    // Wait, the page.tsx uses PUT /api/invoices/[id], so the route file for [id] is separate.
    return NextResponse.json({ error: "Method not allowed on this path" }, { status: 405 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
