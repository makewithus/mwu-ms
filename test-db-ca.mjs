import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
env.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) process.env[k.trim()] = v.trim();
});
const app = initializeApp({
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
});
const db = getFirestore(app);
const snapshot = await getDocs(collection(db, "projects"));
console.log("Total Projects in DB CA:", snapshot.size);
process.exit(0);
