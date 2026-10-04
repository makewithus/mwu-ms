import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// 1. Initialize Central Database (mwu-ms)
const centralEnv = fs.readFileSync('.env', 'utf-8');
centralEnv.split('\n').forEach(line => {
  const [k, ...vArr] = line.split('=');
  const v = vArr.join('=');
  if (k && v) process.env[k.trim()] = v.trim();
});

let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
if (privateKey) privateKey = privateKey.replace(/\\n/g, '\n');

const centralApp = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
}, 'central');
const centralDb = getFirestore(centralApp);

// 2. Initialize Old CMS Database (mwus-556a1)
const cmsApp = initializeApp({
  credential: cert(JSON.parse(fs.readFileSync('../cms-old-key.json', 'utf-8')))
}, 'cms-old');
const cmsDb = getFirestore(cmsApp);

// 3. Initialize Old EMS Database (ems-mwu)
const emsApp = initializeApp({
  credential: cert(JSON.parse(fs.readFileSync('../ems-old-key.json', 'utf-8')))
}, 'ems-old');
const emsDb = getFirestore(emsApp);


async function copyCollection(sourceDb, targetDb, collectionName, matchField) {
  console.log(`\nCopying ${collectionName}...`);
  const snap = await sourceDb.collection(collectionName).get();
  let added = 0;
  let skipped = 0;

  for (let doc of snap.docs) {
    const data = doc.data();
    
    // Check if it already exists by ID
    const existingById = await targetDb.collection(collectionName).doc(doc.id).get();
    if (existingById.exists) {
      skipped++;
      continue;
    }

    // Check if it already exists by a unique field (e.g. email, name)
    if (matchField && data[matchField]) {
      const existingByQuery = await targetDb.collection(collectionName).where(matchField, '==', data[matchField]).get();
      if (!existingByQuery.empty) {
        skipped++;
        continue;
      }
    }

    // Copy it
    await targetDb.collection(collectionName).doc(doc.id).set(data);
    added++;
  }
  
  console.log(`  Added: ${added}`);
  console.log(`  Skipped (already exists): ${skipped}`);
}

async function run() {
  console.log("Starting secure data migration...\n");

  // Migrate CMS Data
  console.log("=== MIGRATING FROM OLD CMS ===");
  await copyCollection(cmsDb, centralDb, 'users', 'email'); // Developers, Admins
  await copyCollection(cmsDb, centralDb, 'projects', 'name');
  await copyCollection(cmsDb, centralDb, 'clients', 'companyName');
  await copyCollection(cmsDb, centralDb, 'invoices', null);
  await copyCollection(cmsDb, centralDb, 'auditLogs', null);
  await copyCollection(cmsDb, centralDb, 'timelineEvents', null);
  await copyCollection(cmsDb, centralDb, 'tasks', null);

  // Migrate EMS Data
  console.log("\n=== MIGRATING FROM OLD EMS ===");
  await copyCollection(emsDb, centralDb, 'users', 'email'); // Employees
  await copyCollection(emsDb, centralDb, 'employees', 'email');
  await copyCollection(emsDb, centralDb, 'companies', 'name');
  await copyCollection(emsDb, centralDb, 'departments', 'name');
  await copyCollection(emsDb, centralDb, 'attendance', null);
  await copyCollection(emsDb, centralDb, 'leaveRequests', null);
  await copyCollection(emsDb, centralDb, 'leaveBalances', null);
  await copyCollection(emsDb, centralDb, 'payroll', null);
  await copyCollection(emsDb, centralDb, 'payslips', null);
  await copyCollection(emsDb, centralDb, 'documents', null);
  await copyCollection(emsDb, centralDb, 'tasks', null);
  await copyCollection(emsDb, centralDb, 'notices', null);
  await copyCollection(emsDb, centralDb, 'notifications', null);
  await copyCollection(emsDb, centralDb, 'activityLogs', null);

  console.log("\nMigration completed successfully!");
}

run().then(() => process.exit(0)).catch(e => {
  console.error("Migration failed:", e);
  process.exit(1);
});
