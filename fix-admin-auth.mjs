import { initializeApp, cert } from 'firebase-admin/app';
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

const adminAuth = getAuth(app);

async function fixUser() {
  try {
    const uid = 'mADLFY8Ve9ctFfXEWlpcxy3wcxw2';
    const email = 'admin_test@makewithus.in';
    const password = 'admin123456';
    
    console.log(`Recreating Auth user for ${email}...`);
    await adminAuth.createUser({
      uid: uid,
      email: email,
      password: password,
      emailVerified: true,
      displayName: "Admin Test",
    });
    console.log("Successfully recreated Auth user!");
  } catch (e) {
    console.error("Failed to recreate Auth user:", e.message);
  }
}

fixUser().then(() => process.exit(0));
