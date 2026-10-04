import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let adminDb: FirebaseFirestore.Firestore;
let adminAuth: import('firebase-admin/auth').Auth;
let adminStorage: import('firebase-admin/storage').Storage;

type ServiceAccountConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizePrivateKey(value: string) {
  return stripWrappingQuotes(value).replace(/\\n/g, '\n');
}

function parseServiceAccountJson(value: string): Partial<ServiceAccountConfig> {
  const normalized = stripWrappingQuotes(value);
  const parsed = JSON.parse(normalized);
  return {
    projectId: parsed.project_id ?? parsed.projectId,
    clientEmail: parsed.client_email ?? parsed.clientEmail,
    privateKey: parsed.private_key ? normalizePrivateKey(parsed.private_key) : undefined,
  };
}

function getServiceAccountConfig(): ServiceAccountConfig {
  const fromJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const fromBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  const parsed = fromJson
    ? parseServiceAccountJson(fromJson)
    : fromBase64
      ? parseServiceAccountJson(Buffer.from(stripWrappingQuotes(fromBase64), 'base64').toString('utf8'))
      : {};

  const projectId = parsed.projectId ?? process.env.FIREBASE_PROJECT_ID;
  const clientEmail = parsed.clientEmail ?? process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = parsed.privateKey ?? (
    process.env.FIREBASE_PRIVATE_KEY ? normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY) : undefined
  );

  const missing = [];
  if (!projectId) missing.push('FIREBASE_PROJECT_ID');
  if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');

  if (missing.length > 0) {
    throw new Error(
      `Firebase Admin SDK is misconfigured: missing env var(s) ${missing.join(', ')}. ` +
      'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY, or set FIREBASE_SERVICE_ACCOUNT_JSON/FIREBASE_SERVICE_ACCOUNT_BASE64.'
    );
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin SDK is misconfigured: incomplete service account credentials.');
  }

  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error(
      'Firebase Admin SDK is misconfigured: the private key does not look like a valid PEM key. ' +
      'Use the full key including BEGIN/END PRIVATE KEY markers, or provide the full service account JSON.'
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

try {
  if (!getApps().length) {
    const serviceAccount = getServiceAccountConfig();

    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  adminDb = getFirestore();
  adminAuth = getAuth();
  adminStorage = getStorage();
} catch (error: any) {
  console.error("Firebase Admin SDK failed to initialize:", error.message);
  const throwConfigError = (target: any, prop: string | symbol) => {
    if (prop === 'then' || prop === '__esModule' || typeof prop === 'symbol') {
      return undefined;
    }
    throw error;
  };
  adminDb = new Proxy({} as any, { get: throwConfigError });
  adminAuth = new Proxy({} as any, { get: throwConfigError });
  adminStorage = new Proxy({} as any, { get: throwConfigError });
}

export { adminDb, adminAuth, adminStorage };
