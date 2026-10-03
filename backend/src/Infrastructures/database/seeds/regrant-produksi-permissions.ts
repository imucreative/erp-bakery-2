/**
 * Re-grant PRODUKSI Permissions — maintenance script (existing companies)
 *
 * Context:
 *   The `permissions.seed.ts` change (PRODUKSI now uses `production-order.read` +
 *   `production-order.manage` instead of the no-op guard `production.manage`) only
 *   affects companies registered AFTER the change. Existing companies' PRODUKSI
 *   roles still carry `production.manage` and lack `production-order.*`, so their
 *   production staff cannot access the Production Order module.
 *
 * What this script does, per role with code = 'PRODUKSI' (ALL companies), in ONE
 * transaction:
 *   1. GRANT  `production-order.read`  (idempotent, ON CONFLICT DO NOTHING)
 *   2. GRANT  `production-order.manage`(idempotent, ON CONFLICT DO NOTHING)
 *   3. REVOKE `production.manage`      (DELETE from role_permissions)
 *
 *   It NEVER touches `recipe.manage` or any other permission, and NEVER touches
 *   any role other than PRODUKSI. It does NOT modify the permission catalogue.
 *
 * Flags:
 *   --dry-run   Print the planned operations (which role in which company, what
 *               would be inserted/deleted) WITHOUT executing. Default (no flag) =
 *               execute.
 *
 * Idempotent: safe to re-run; a second run makes zero changes.
 *
 * Usage:
 *   NODE_ENV=development npx ts-node -r tsconfig-paths/register \
 *     src/Infrastructures/database/seeds/regrant-produksi-permissions.ts [--dry-run]
 */

import 'dotenv/config';
import { Pool, PoolClient } from 'pg';

/** Permission codes to GRANT to every PRODUKSI role. */
const GRANT_CODES = ['production-order.read', 'production-order.manage'] as const;

/** Permission codes to REVOKE from every PRODUKSI role. */
const REVOKE_CODES = ['production.manage'] as const;

const ROLE_CODE = 'PRODUKSI';

interface ProduksiRoleRow {
  roleId: string;
  companyId: string | null;
  companyName: string;
}

interface PermissionRow {
  id: string;
  code: string;
}

interface CompanyPlan {
  roleId: string;
  companyId: string | null;
  companyName: string;
  grantsToAdd: string[]; // permission codes that are currently missing
  revokesToDo: string[]; // permission codes that are currently present
}

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5435,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

/** Resolve permission ids by code. Throws if any requested code is missing. */
async function resolvePermissionIds(
  client: PoolClient,
  codes: readonly string[],
): Promise<Map<string, string>> {
  const result = await client.query<PermissionRow>(
    'SELECT id, code FROM permissions WHERE code = ANY($1::text[])',
    [[...codes]],
  );

  const byCode = new Map<string, string>();
  for (const row of result.rows) {
    byCode.set(row.code, row.id);
  }

  const missing = codes.filter((c) => !byCode.has(c));
  if (missing.length > 0) {
    throw new Error(
      `Permission catalogue is missing required code(s): ${missing.join(', ')}. ` +
        'Run the permissions seed first (npm run seed).',
    );
  }

  return byCode;
}

/** Fetch every role (across all companies) whose code is PRODUKSI. */
async function findProduksiRoles(client: PoolClient): Promise<ProduksiRoleRow[]> {
  const result = await client.query<{
    role_id: string;
    company_id: string | null;
    company_name: string | null;
  }>(
    `SELECT r.id AS role_id,
            r.company_id AS company_id,
            c.name AS company_name
       FROM roles r
       LEFT JOIN companies c ON c.id = r.company_id
      WHERE r.code = $1
      ORDER BY c.name NULLS FIRST, r.id`,
    [ROLE_CODE],
  );

  return result.rows.map((row) => ({
    roleId: row.role_id,
    companyId: row.company_id,
    companyName: row.company_name ?? '(platform-level / no company)',
  }));
}

/** Which grant codes a role is currently missing, and which revoke codes it currently has. */
async function buildRolePlan(
  client: PoolClient,
  role: ProduksiRoleRow,
  grantIds: Map<string, string>,
  revokeIds: Map<string, string>,
): Promise<CompanyPlan> {
  const existing = await client.query<{ permission_id: string }>(
    'SELECT permission_id FROM role_permissions WHERE role_id = $1',
    [role.roleId],
  );
  const owned = new Set(existing.rows.map((r) => r.permission_id));

  const grantsToAdd = GRANT_CODES.filter((code) => !owned.has(grantIds.get(code)!));
  const revokesToDo = REVOKE_CODES.filter((code) => owned.has(revokeIds.get(code)!));

  return {
    roleId: role.roleId,
    companyId: role.companyId,
    companyName: role.companyName,
    grantsToAdd: [...grantsToAdd],
    revokesToDo: [...revokesToDo],
  };
}

function printPlan(plans: CompanyPlan[], dryRun: boolean): void {
  const banner = dryRun ? 'DRY-RUN — planned operations (nothing executed)' : 'EXECUTION PLAN';
  console.log(`\n──────── ${banner} ────────`);
  console.log(`Roles found with code '${ROLE_CODE}': ${plans.length}\n`);

  for (const plan of plans) {
    console.log(`• Company: ${plan.companyName}`);
    console.log(`  role_id: ${plan.roleId} (company_id: ${plan.companyId ?? 'NULL'})`);
    if (plan.grantsToAdd.length > 0) {
      console.log(`  GRANT : ${plan.grantsToAdd.join(', ')}`);
    } else {
      console.log('  GRANT : (none — already present)');
    }
    if (plan.revokesToDo.length > 0) {
      console.log(`  REVOKE: ${plan.revokesToDo.join(', ')}`);
    } else {
      console.log('  REVOKE: (none — already absent)');
    }
    console.log('');
  }
}

/** Apply the plan (INSERT grants idempotently, DELETE revokes). Returns tallies. */
async function applyPlan(
  client: PoolClient,
  plans: CompanyPlan[],
  grantIds: Map<string, string>,
  revokeIds: Map<string, string>,
): Promise<{ grants: number; revokes: number }> {
  let grants = 0;
  let revokes = 0;

  for (const plan of plans) {
    for (const code of plan.grantsToAdd) {
      const res = await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         VALUES ($1, $2)
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [plan.roleId, grantIds.get(code)!],
      );
      grants += res.rowCount ?? 0;
    }

    for (const code of plan.revokesToDo) {
      const res = await client.query(
        'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [plan.roleId, revokeIds.get(code)!],
      );
      revokes += res.rowCount ?? 0;
    }
  }

  return { grants, revokes };
}

function printSummary(
  plans: CompanyPlan[],
  tallies: { grants: number; revokes: number },
  dryRun: boolean,
): void {
  const grantsPlanned = plans.reduce((acc, p) => acc + p.grantsToAdd.length, 0);
  const revokesPlanned = plans.reduce((acc, p) => acc + p.revokesToDo.length, 0);

  console.log('──────── SUMMARY ────────');
  console.log(`Roles processed       : ${plans.length}`);
  if (dryRun) {
    console.log(`Grants to add (planned): ${grantsPlanned}`);
    console.log(`Revokes to do (planned): ${revokesPlanned}`);
    console.log('\n(dry-run — no changes were written)');
  } else {
    console.log(`Grants added          : ${tallies.grants} (planned ${grantsPlanned})`);
    console.log(`Revokes done          : ${tallies.revokes} (planned ${revokesPlanned})`);
  }
  console.log('');
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const grantIds = await resolvePermissionIds(client, GRANT_CODES);
    const revokeIds = await resolvePermissionIds(client, REVOKE_CODES);

    const roles = await findProduksiRoles(client);
    const plans: CompanyPlan[] = [];
    for (const role of roles) {
      plans.push(await buildRolePlan(client, role, grantIds, revokeIds));
    }

    printPlan(plans, dryRun);

    let tallies = { grants: 0, revokes: 0 };
    if (dryRun) {
      // Never persist in dry-run — roll back the read-only transaction.
      await client.query('ROLLBACK');
    } else {
      tallies = await applyPlan(client, plans, grantIds, revokeIds);
      await client.query('COMMIT');
    }

    printSummary(plans, tallies, dryRun);
    console.log(dryRun ? '🔎 Dry-run completed (no changes).' : '🎉 Re-grant completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Re-grant failed — rolled back', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
