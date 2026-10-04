import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let adminDb: FirebaseFirestore.Firestore;
let adminAuth: import('firebase-admin/auth').Auth;
let adminStorage: import('firebase-admin/storage').Storage;

try {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    } else if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (!getApps().length) {
    const missing = [];
    if (!process.env.FIREBASE_PROJECT_ID) missing.push("FIREBASE_PROJECT_ID");
    if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push("FIREBASE_CLIENT_EMAIL");
    if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");

    if (missing.length > 0) {
      throw new Error(
        `Firebase Admin SDK is misconfigured: missing env var(s) ${missing.join(", ")}. ` +
        `Set these in Vercel settings.`
      );
    }

    if (!privateKey?.includes("BEGIN PRIVATE KEY")) {
      throw new Error(
        "Firebase Admin SDK is misconfigured: FIREBASE_PRIVATE_KEY does not look like a valid PEM key. " +
        "Make sure the full key was pasted."
      );
    }

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
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
