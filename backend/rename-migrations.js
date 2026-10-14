// rename-migrations.js
// Usage: node rename-migrations.js
// This script renames all migration files in the backend/migrations directory
// to use a Unix‑epoch‑millisecond timestamp prefix, which node‑pg‑migrate expects.
// It preserves the original order by incrementing the timestamp by 1 ms for each file.

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');

let files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js'));
files.sort();

let baseTimestamp = Date.now();
files.forEach((oldName, idx) => {
  const oldPath = path.join(migrationsDir, oldName);
  const nameWithoutPrefix = oldName.replace(/^\d+_/, '');
  const newTimestamp = baseTimestamp + idx;
  const newName = `${newTimestamp}_${nameWithoutPrefix}`;
  const newPath = path.join(migrationsDir, newName);
  if (oldName !== newName) {
    console.log(`Renaming ${oldName} → ${newName}`);
    fs.renameSync(oldPath, newPath);
  }
});
console.log('Migration files renamed successfully.');
