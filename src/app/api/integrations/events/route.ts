import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requirePermission } from '@/lib/auth/server';
import { verifyServiceToken } from '@/lib/auth/service';
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type IntegrationEventData = {
  eventType?: string;
  type?: string;
  timestamp?: unknown;
  createdAt?: unknown;
  [key: string]: unknown;
};

type NormalizedIntegrationEvent = IntegrationEventData & {
  id: string;
  eventType: string;
  type: string;
  timestamp: string;
  createdAt: string;
};

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (typeof value === 'object' && 'seconds' in value && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString();
  }
  return null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected integration event error';
}

function normalizeEvent(doc: QueryDocumentSnapshot): NormalizedIntegrationEvent {
  const data = doc.data() as IntegrationEventData;
  const timestamp = toIsoString(data.timestamp ?? data.createdAt) ?? new Date(0).toISOString();

  return {
    id: doc.id,
    ...data,
    eventType: data.eventType ?? data.type ?? 'UNKNOWN_EVENT',
    type: data.type ?? data.eventType ?? 'UNKNOWN_EVENT',
    timestamp,
    createdAt: toIsoString(data.createdAt) ?? timestamp,
  };
}

function eventTime(event: { timestamp?: string; createdAt?: string }) {
  return new Date(event.timestamp ?? event.createdAt ?? 0).getTime() || 0;
}

export async function GET(req: NextRequest) {
  // Allow either Service Token (backend) or Super Admin (frontend UI)
  const isService = verifyServiceToken(req);
  let isAuthorizedUser = false;
  
  if (!isService) {
    const auth = await requirePermission(req, 'canManageProjects');
    isAuthorizedUser = auth.authorized;
  }

  if (!isService && !isAuthorizedUser) {
    return NextResponse.json({ error: 'Unauthorized integration access' }, { status: 401 });
  }

  try {
    let query: Query = adminDb.collection('integrationEvents');

    if (isService) {
      query = query.where('status', '==', 'PENDING');
    }

    const snap = await query.limit(100).get();
    const events = snap.docs
      .map(normalizeEvent)
      .sort((a, b) => isService ? eventTime(a) - eventTime(b) : eventTime(b) - eventTime(a))
      .slice(0, 50);

    return NextResponse.json({ events });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!verifyServiceToken(req)) {
    return NextResponse.json({ error: 'Unauthorized integration service' }, { status: 401 });
  }

  try {
    const { eventId, status, error: lastError } = await req.json();
    
    const eventRef = adminDb.collection('integrationEvents').doc(eventId);
    await eventRef.update({
      status,
      lastError: lastError || null,
      processedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
