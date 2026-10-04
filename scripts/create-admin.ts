import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: '.env.local' });

const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!privateKey) {
  console.error("ERROR: Missing FIREBASE_PRIVATE_KEY in .env.local");
  process.exit(1);
}

const app = !getApps().length
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      })
    })
  : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

async function createSuperAdmin() {
  const email = process.argv[2] || 'admin@mwums.com';
  const password = process.argv[3] || 'SuperSecret123!';

  try {
    console.log(`Creating user: ${email}...`);
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log('User already exists in Firebase Auth, updating password...');
      await auth.updateUser(user.uid, { password });
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        user = await auth.createUser({
          email,
          password,
        });
      } else {
        throw e;
      }
    }

    console.log('Assigning SUPER_ADMIN role in Firestore...');
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      role: 'SUPER_ADMIN',
      createdAt: new Date().toISOString()
    }, { merge: true });

    console.log(`\n✅ Success! You can now log into Central Admin with:`);
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    
  } catch (error) {
    console.error('Error creating super admin:', error);
  }
}

createSuperAdmin();
