import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
env.split('\n').forEach(line => {
  const [k, ...vArr] = line.split('=');
  const v = vArr.join('=');
  if (k && v) process.env[k.trim()] = v.trim();
});
const app = initializeApp({
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
});
const db = getFirestore(app);
const snapshot = await getDocs(collection(db, "users"));
console.log("Total Users:", snapshot.size);
snapshot.docs.forEach(doc => {
  const data = doc.data();
  if(data.displayName?.includes("Gupta") || data.email?.includes("emp1011")) {
      console.log("FOUND GUPTA IN USERS!", doc.id, data);
  }
});
process.exit(0);
