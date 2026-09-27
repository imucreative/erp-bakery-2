/**
 * Smoke Test — verifikasi flow inti backend ERP Bakery lewat HTTP.
 *
 * Menguji alur nyata (bukan unit test):
 *   1. POST /companies/register  → daftar company + owner (public)
 *   2. POST /auth/login          → dapat accessToken + refreshToken
 *   3. GET  /companies/me        → akses endpoint terproteksi pakai accessToken
 *   4. PUT  /auth/refresh        → tukar refreshToken jadi accessToken baru
 *   5. DELETE /auth/logout       → revoke refreshToken
 *   6. PUT  /auth/refresh (lagi) → HARUS gagal (token sudah dicabut)
 *
 * Prasyarat:
 *   - PostgreSQL hidup di port 5435 (docker compose up -d)
 *   - Migrasi & seed sudah jalan (npm run migrate && npm run seed)
 *   - Server hidup (npm run start:dev) — atau set BASE_URL ke server yang aktif
 *
 * Jalankan:
 *   npx ts-node scripts/smoke-test.ts
 */

const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000/api/v1';

// Slug unik per run agar bisa dijalankan berulang tanpa konflik
const unique = Date.now().toString(36);
const company = {
  name: `Smoke Bakery ${unique}`,
  slug: `smoke-bakery-${unique}`,
  ownerName: 'Smoke Owner',
  ownerEmail: `owner-${unique}@smoke.test`,
  ownerPassword: 'Secret1234',
};

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function req(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function main(): Promise<void> {
  console.log(`\n🔥 Smoke test → ${BASE_URL}\n`);

  // 1. Register company
  console.log('1) POST /companies/register');
  const reg = await req('POST', '/companies/register', company);
  check('status 201', reg.status === 201, `got ${reg.status}`);
  check('response success', reg.json?.success === true);
  check('company code returned', !!reg.json?.data?.company?.code);
  check('owner email matches', reg.json?.data?.owner?.email === company.ownerEmail);

  // 2. Login
  console.log('2) POST /auth/login');
  const login = await req('POST', '/auth/login', {
    email: company.ownerEmail,
    password: company.ownerPassword,
  });
  check('status 200', login.status === 200, `got ${login.status}`);
  check('accessToken returned', !!login.json?.data?.accessToken);
  check('refreshToken returned', !!login.json?.data?.refreshToken);

  const accessToken = login.json?.data?.accessToken;
  const refreshToken = login.json?.data?.refreshToken;

  // 3. Protected endpoint
  console.log('3) GET /companies/me (protected)');
  const me = await req('GET', '/companies/me', undefined, accessToken);
  check('status 200', me.status === 200, `got ${me.status}`);
  check('company slug matches', me.json?.data?.slug === company.slug);

  // 3b. Protected endpoint tanpa token harus 401
  console.log('3b) GET /companies/me tanpa token → harus 401');
  const meNoToken = await req('GET', '/companies/me');
  check('status 401', meNoToken.status === 401, `got ${meNoToken.status}`);

  // 4. Refresh
  console.log('4) PUT /auth/refresh');
  const refresh = await req('PUT', '/auth/refresh', { refreshToken });
  check('status 200', refresh.status === 200, `got ${refresh.status}`);
  check('new accessToken returned', !!refresh.json?.data?.accessToken);

  // 5. Logout
  console.log('5) DELETE /auth/logout');
  const logout = await req('DELETE', '/auth/logout', { refreshToken });
  check('status 200', logout.status === 200, `got ${logout.status}`);

  // 6. Refresh setelah logout harus gagal
  console.log('6) PUT /auth/refresh setelah logout → harus gagal (401)');
  const refreshAfterLogout = await req('PUT', '/auth/refresh', { refreshToken });
  check('status 401', refreshAfterLogout.status === 401, `got ${refreshAfterLogout.status}`);

  // Ringkasan
  console.log(`\n────────────────────────────`);
  console.log(`  Passed: ${passed}   Failed: ${failed}`);
  console.log(`────────────────────────────\n`);

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\n💥 Smoke test error:', e.message);
  console.error('   Pastikan server hidup dan DB (port 5435) sudah migrate + seed.');
  process.exit(2);
});
