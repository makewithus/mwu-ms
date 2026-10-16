import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyApiRequest } from '@/lib/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let snap: FirebaseFirestore.QuerySnapshot;
    try {
      snap = await adminDb.collection('notifications').orderBy('createdAt', 'desc').limit(100).get();
    } catch {
      // Fallback if ordering fails
      snap = await adminDb.collection('notifications').limit(100).get();
    }

    const notifications = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type || 'general',
        title: data.title || 'System Notification',
        message: data.message || '',
        userId: data.userId || null,
        targetEmail: data.targetEmail || null,
        targetName: data.targetName || null,
        isRead: !!data.isRead,
        link: data.link || null,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null,
      };
    });

    return NextResponse.json({ notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyApiRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const docRef = adminDb.collection('notifications').doc();

    const notifData = {
      type: body.type || 'general',
      title: (body.title || '').trim(),
      message: (body.message || '').trim(),
      userId: body.userId || (body.targetUserId === 'ALL' ? null : body.targetUserId) || null,
      targetUserId: body.targetUserId || null,
      targetEmail: body.targetEmail || null,
      targetName: body.targetName || null,
      isRead: false,
      link: body.link || null,
      createdBy: auth.email || 'Admin',
      createdAt: new Date().toISOString(),
    };

    await docRef.set(notifData);
    return NextResponse.json({ success: true, id: docRef.id, notification: notifData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyApiRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { id, isRead } = await req.json();
    if (!id) return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });

    await adminDb.collection('notifications').doc(id).update({
      isRead: !!isRead,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await verifyApiRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });

    await adminDb.collection('notifications').doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
