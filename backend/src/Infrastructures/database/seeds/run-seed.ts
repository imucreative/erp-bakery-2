/**
 * Database Seeder
 *
 * Seeds:
 * 1. All permissions (idempotent via ON CONFLICT DO NOTHING)
 * 2. SUPER_ADMIN user (from .env — no API endpoint for this)
 * 3. Platform roles (SUPER_ADMIN role with NULL company_id)
 *
 * At register-company time, company-scoped roles are seeded dynamically
 * using DEFAULT_ROLES from permissions.seed.ts.
 *
 * Usage:
 *   NODE_ENV=development npx ts-node -r tsconfig-paths/register \
 *     src/Infrastructures/database/seeds/run-seed.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { PERMISSIONS } from './permissions.seed';

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5435,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

async function seedPermissions(client: { query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }): Promise<void> {
  console.log('⏳ Seeding permissions...');

  for (const p of PERMISSIONS) {
    await client.query(
      `INSERT INTO permissions (code, name, domain, module_key, module_name, action, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         domain = EXCLUDED.domain,
         module_key = EXCLUDED.module_key,
         module_name = EXCLUDED.module_name,
         action = EXCLUDED.action,
         sort_order = EXCLUDED.sort_order`,
      [p.code, p.name, p.domain, p.module_key, p.module_name, p.action, p.sort_order],
    );
  }

  console.log(`✅ ${PERMISSIONS.length} permissions seeded`);
}

async function seedSuperAdmin(client: { query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL ?? 'admin@erp.local';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? '12345678';
  const name = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';

  console.log(`⏳ Seeding SUPER_ADMIN (${email})...`);

  const existing = await client.query(
    'SELECT id FROM users WHERE email = $1 AND is_super_admin = TRUE',
    [email],
  );

  if (existing.rows.length > 0) {
    console.log('⚠️  SUPER_ADMIN already exists — skipping');
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  await client.query(
    `INSERT INTO users (name, email, password, is_super_admin, company_id, role_id, is_active)
     VALUES ($1, $2, $3, TRUE, NULL, NULL, TRUE)`,
    [name, email, hashed],
  );

  console.log('✅ SUPER_ADMIN seeded');
}

async function main(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await seedPermissions(client);
    await seedSuperAdmin(client);

    await client.query('COMMIT');
    console.log('\n🎉 Seed completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed — rolled back', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
