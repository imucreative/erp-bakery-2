#!/usr/bin/env node
/**
 * Run node-pg-migrate against the TEST database.
 *
 * `node-pg-migrate` gives DATABASE_URL precedence over the -f config file, and
 * `.env` contains the main/development URL. This wrapper builds a test URL from
 * the PGTEST_* variables and overrides DATABASE_URL for the child process so
 * `npm run migrate:test` can never accidentally migrate the dev database.
 */
require('dotenv').config();

const path = require('path');
const { spawnSync } = require('child_process');

const host = process.env.PGHOST_TEST;
const port = process.env.PGPORT_TEST || '5435';
const user = process.env.PGUSER_TEST;
const password = process.env.PGPASSWORD_TEST || '';
const database = process.env.PGDATABASE_TEST;

if (!host || !user || !database) {
  console.error(
    'Missing test DB env. Set PGHOST_TEST, PGUSER_TEST, and PGDATABASE_TEST in backend/.env.',
  );
  process.exit(1);
}

const databaseUrl =
  `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
  `@${host}:${port}/${encodeURIComponent(database)}`;

const direction = process.argv[2] || 'up';
const bin = path.join(
  __dirname,
  '..',
  'node_modules',
  'node-pg-migrate',
  'bin',
  'node-pg-migrate.js',
);

const result = spawnSync(process.execPath, [bin, direction], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    NODE_ENV: 'test',
  },
});

process.exit(result.status ?? 1);
