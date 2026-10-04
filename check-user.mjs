import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
env.split('\n').forEach(line => {
  const [k, ...vArr] = line.split('=');
  const v = vArr.join('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
if (privateKey) privateKey = privateKey.replace(/\\n/g, '\n');

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
});

const adminDb = getFirestore(app);
const adminAuth = getAuth(app);

async function check() {
  try {
    const user = await adminAuth.getUserByEmail('admin_test@makewithus.in');
    console.log("FOUND IN AUTH:", user.uid);
    const doc = await adminDb.collection('users').doc(user.uid).get();
    if (doc.exists) {
      console.log("FOUND IN FIRESTORE:", doc.data());
    } else {
      console.log("NOT IN FIRESTORE!");
    }
  } catch (e) {
    console.error("NOT IN AUTH:", e.message);
  }
  
  // also check central-admin seed user
  const snap = await adminDb.collection('users').where('role', 'in', ['admin', 'super_admin']).get();
  console.log("ALL ADMINS:");
  snap.docs.forEach(d => console.log(d.id, d.data().email, d.data().role));
}

check().then(() => process.exit(0));
