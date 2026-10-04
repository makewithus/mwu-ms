# Migration Scripts

This folder contains tools to migrate data from the legacy EMS and CMS Firebase projects into the new unified Central Database.

## Prerequisites
1. Ensure `ts-node` is installed or compile the script before running.
2. Download the Firebase Admin SDK private key JSON files for the three projects and place them here:
   - `ems-service-account.json`
   - `cms-service-account.json`
   - `central-service-account.json`
   
**WARNING: DO NOT commit these JSON files to git.** They are ignored in `.gitignore`.

## Running the Migration
By default, the script runs in **Dry-Run Mode** (it will read data but will NOT write anything to the Central DB).

```bash
npx ts-node migrate.ts
```

To execute the live migration:
```bash
npx ts-node migrate.ts --live
```

## Rollback
If the live migration fails, the legacy projects remain untouched. Applications can be instantly rolled back by altering their environment variables.
