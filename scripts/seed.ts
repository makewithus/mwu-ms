import { initializeApp as initAdmin, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp as initWeb } from 'firebase/app';
import { getAuth as getWebAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore as getWebFirestore, collection as webCollection, getDocs as webGetDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Convert Web SDK Timestamps to Admin SDK Timestamps
function convertData(data: any): any {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(convertData);
  if (typeof data === 'object') {
    // If it's a web timestamp (has seconds and nanoseconds)
    if ('seconds' in data && 'nanoseconds' in data && Object.keys(data).length <= 4) {
      return new Timestamp(data.seconds, data.nanoseconds);
    }
    const result: any = {};
    for (const key in data) {
      result[key] = convertData(data[key]);
    }
    return result;
  }
  return data;
}

async function run() {
  console.log("Initializing Central DB...");
  const centralApp = initAdmin({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  }, 'central');
  const centralDb = getAdminFirestore(centralApp);

  console.log("Initializing CMS DB...");
  const cmsApp = initAdmin({
    credential: cert({
      projectId: "mwu-ms",
      clientEmail: "firebase-adminsdk-fbsvc@mwu-ms.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCsowwjbWXqF71F\nkwIqrvhmYkrO8EM1Ocrc78FJCYwe0AN1fwYQjIs9X7Cc5EjOJ8w6ImoxhqLvGP9T\ng3rCdZM1Lrg6VPmX3syIgrBh1iV5apjQxzEnI/xbJSRXxb6YdkE8DAD5G+iL2NOc\nCaJMV3LUD2mhLEFOHiO0GbxJUQAJF4SwUOohusLa7HFtHzWXq9XhhbWz8BWkztnZ\nRNgTvc2YXSdo/D+Y1L3AZIwnSlCN/2avDvRtCdNDe1cuZ35aZaMfpEenIbVw0gub\nR10K4/eRdsHG30cZt3AUb+GYDIPjV3jHrTzy1ukEwyz4TOwp4JYlDDhCc/p0iOb7\ncxzuKtZfAgMBAAECggEASr4UxUnZ8+3vPi4VpBE47mrj5JBVKLgqwljzIAIILlb1\nCGvEXmna5umE94hGlSrZ2tmHjIW0CTyTXr7v6T0qTL47eNXNchk+CGQ8pT8n3ldu\nbgWvnDiSS4vbHj049Z1NRQgVa8TPe6yWgVoScGb0CifaHbOhWobmAlWaFUwCbeyQ\nB0zGdUWLw42guK1JOZAoSQzalJh/OW9a8t0Ucx3ZVPtEVotJ2KJ8/uNahs8SQ54D\n0WF1zXM1hZXUpZzoPpkFFFU5DdumFNMWwSzQitmyHABpHxJEqceD0GH+JKKc5E3/\n9XNWGBqtIxywZRZTB4nWQL4mRPxuK0Ge2zcgu+/CwQKBgQDlSOsH+PA5r+Zji5sJ\n8NTrvA4GUbQlq9u+dKgquwgjwqKpAgHwpKgFnElEx2C98zIvvsXXAJWwHMHRSVyu\nBugRkRnrRcRFEiHmffy8HzG4zUIzkZ0zDaqgiBkD7V2Rdbwl8l/mIe+esQnSsf/P\ng2jhwkGvNyfXMJqZtppqlHRHcQKBgQDAwHD3Df6oVuCzAU+bcu42MZ6OguKixyQc\n6CO2NGao45l1x1Jc68yGwiOHz476iS//D0ZciSdUkYl8aIB3aAgw19XUS6s/iWOo\nR2THJHHVxGGMf5uVFY7YLKsKJCdF8uBzTPHbTiBtOjXdjT8XE2ClOR9RdMxjlFcD\nnvrWcsEyzwKBgQDTkI0ONi2zjRNRFyhf69EME+H9Arbva7y/6HSjuSCxno7o0+lm\nWwiO5L7WsAIcQ6MzWxzCXs/ASUiuDLtv+P959iGsbhvEgA6319i03TPMCdnkK6CZ\n0yp2Jh6u+P81kSWi/hpvBzFLhKBDwesBV4gXiF+DhalFbpu46j1hysnggQKBgQCu\n/wiQhFgrpZSjcBFCZHn5Idt+Lz5r4rjatbeWeMSrmNd+otQYIMyznBZ9+ucodtzo\niImtAah/kxJrrMTVo9Gr5ojwETMMoEOmSAsq8d+X4I9f64rpM4VYplUzA9fUHcnB\nZJ5AKRIvmKXG27Hn1WPtHYtdfNkDn23Qj8nUYKMe6QKBgFnOpA+mgBzeRH799gGA\nl7tLTV+P4z4Y+IOEeu2c0/xVcMeETo5mvP5rB7+BlhfBEG4sBKQj9Q9l+d/NBIRG\nYp6L1KW9Zj9xMRrC3rb1V8EWsN8IOlkveoy4Dro3VsAu5k4EQVWhbWips7rFn66A\nTTdDjbTzIbfj7oGbt9t7D3Aa\n-----END PRIVATE KEY-----\n"
    })
  }, 'cms');
  const cmsDb = getAdminFirestore(cmsApp);

  console.log("Initializing EMS DB via Web SDK...");
  const emsApp = initWeb({
    apiKey: "AIzaSyA3wcrNeSj09x-E0WU_ofZOkHVkSeGJk50",
    authDomain: "mwu-ems.firebaseapp.com",
    projectId: "mwu-ems"
  }, 'ems');
  const emsAuth = getWebAuth(emsApp);
  const emsDb = getWebFirestore(emsApp);

  console.log("Authenticating to EMS...");
  try {
    await signInWithEmailAndPassword(emsAuth, "admin_test@makewithus.in", "admin123456");
    console.log("Logged into EMS as admin.");
  } catch (err: any) {
    console.log("EMS Auth failed:", err.message);
  }

  // 1. Copy CMS Data
  const cmsCollections = ['clients', 'projects'];
  for (const c of cmsCollections) {
    const snap = await cmsDb.collection(c).get();
    let cnt = 0;
    for (const doc of snap.docs) {
      await centralDb.collection(c).doc(doc.id).set(doc.data());
      cnt++;
    }
    console.log(`Copied ${cnt} ${c} from CMS to Central DB`);
  }

  // 2. Copy EMS Data
  const emsCollections = ['employees', 'users', 'tasks'];
  for (const c of emsCollections) {
    const snap = await webGetDocs(webCollection(emsDb, c));
    let cnt = 0;
    for (const doc of snap.docs) {
      const data = convertData(doc.data());
      await centralDb.collection(c).doc(doc.id).set(data);
      cnt++;
    }
    console.log(`Copied ${cnt} ${c} from EMS to Central DB`);
  }

  console.log("Data seeding completed successfully!");
  process.exit(0);
}

run().catch(console.error);
