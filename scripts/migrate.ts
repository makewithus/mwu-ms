import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

/**
 * MIGRATION TOOL (PHASE 14)
 * 
 * To run this script, you must provide actual service account keys for all three projects.
 * This script implements a DRY-RUN by default to ensure safety.
 * Run with `--live` to actually execute writes.
 */

const isLive = process.argv.includes('--live');

if (!isLive) {
  console.log("=== RUNNING IN DRY-RUN MODE ===");
  console.log("No data will be written to the Central Database.");
} else {
  console.log("=== RUNNING LIVE MIGRATION ===");
  console.log("WARNING: Writing to Central DB!");
}

// Ensure you place these JSON files locally (DO NOT COMMIT THEM)
const emsCreds = require('./ems-service-account.json');
const cmsCreds = require('./cms-service-account.json');
const centralCreds = require('./central-service-account.json');

const emsApp = initializeApp({
  credential: cert(emsCreds),
  projectId: 'mwu-ems'
}, 'ems-legacy');

const cmsApp = initializeApp({
  credential: cert(cmsCreds),
  projectId: 'mwus-556a1'
}, 'cms-legacy');

const centralApp = initializeApp({
  credential: cert(centralCreds),
  projectId: 'mwu-central-db'
}, 'central');

const emsDb = getFirestore(emsApp);
const cmsDb = getFirestore(cmsApp);
const centralDb = getFirestore(centralApp);

async function migrateCollection(sourceDb: Firestore, sourceCollection: string, destCollection: string, transformFn?: (data: any) => any) {
  console.log(`Migrating ${sourceCollection} to ${destCollection}...`);
  const snapshot = await sourceDb.collection(sourceCollection).get();
  let count = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const finalData = transformFn ? transformFn(data) : data;
    
    if (isLive) {
      await centralDb.collection(destCollection).doc(doc.id).set(finalData);
    }
    count++;
  }
  console.log(`Migrated ${count} records for ${sourceCollection}.`);
}

async function runMigration() {
  try {
    console.log("Starting Migration...");
    
    // EMS -> Central
    await migrateCollection(emsDb, 'employees', 'employees');
    await migrateCollection(emsDb, 'attendance', 'attendance');
    await migrateCollection(emsDb, 'leaveRequests', 'leaveRequests');
    await migrateCollection(emsDb, 'payroll', 'payroll');
    await migrateCollection(emsDb, 'notices', 'notices');
    await migrateCollection(emsDb, 'documents', 'documents');
    await migrateCollection(emsDb, 'tasks', 'employeeTasks'); // Rename to avoid confusion with projects tasks if any

    // CMS -> Central
    await migrateCollection(cmsDb, 'clients', 'clients');
    await migrateCollection(cmsDb, 'projects', 'projects');
    await migrateCollection(cmsDb, 'auditLogs', 'legacyCmsAuditLogs');

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

runMigration();
