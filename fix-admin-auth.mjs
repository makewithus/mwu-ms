import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
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
const adminDb = getFirestore(app);

async function fixUser() {
  try {
    const email = 'admin_test@makewithus.in';
    const password = 'admin12345';
    
    console.log(`Ensuring Auth user for ${email}...`);
    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
      await adminAuth.updateUser(user.uid, {
        password,
        emailVerified: true,
        displayName: "Admin Test",
        disabled: false,
      });
    } catch (e) {
      if (e.code !== 'auth/user-not-found') throw e;
      user = await adminAuth.createUser({
        email,
        password,
        emailVerified: true,
        displayName: "Admin Test",
      });
    }

    await adminDb.collection('users').doc(user.uid).set({
      uid: user.uid,
      email,
      displayName: 'Admin Test',
      role: 'super_admin',
      status: 'Active',
      isActive: true,
      companyId: 'makewithus',
      updatedAt: new Date(),
    }, { merge: true });

    console.log("Successfully ensured EMS super admin account.");
    console.log("Email:", email);
    console.log("Password:", password);
  } catch (e) {
    console.error("Failed to ensure Auth user:", e.message);
    process.exitCode = 1;
  }
}

fixUser().then(() => process.exit(0));
