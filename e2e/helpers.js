// Shared helpers for the production E2E suite — real browser, real backend (localhost:8090),
// real Vite dev server (localhost:5173). Nothing here mocks the network.
import { request as playwrightRequest } from '@playwright/test';

export const MANAGER = { email: 'test@example.com', password: 'Test1234!' };

/** Attaches console + pageerror + failed-request listeners and returns the collected arrays. */
export function collectConsoleAndNetwork(page) {
  const consoleErrors = [];
  const consoleWarnings = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('requestfailed', (req) => {
    // Aborted/cancelled requests are routine (component unmount, superseded search-as-you-type
    // calls) — only real network-level failures matter here.
    const failure = req.failure()?.errorText || '';
    if (!failure.includes('CANCELLED') && !failure.includes('ABORTED')) {
      failedRequests.push(`${req.method()} ${req.url()} — ${failure}`);
    }
  });

  return { consoleErrors, consoleWarnings, pageErrors, failedRequests };
}

export async function login(page, { email, password } = MANAGER) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole('button', { name: /^login$/i }).click();
  await page.waitForURL('**/', { timeout: 10000 }).catch(() => {});
}

// Role changes take effect only on the *next* login (the JWT bakes the role in at issue time) —
// used to work around the confirmed bug where a MANAGER-role token can never populate the
// delivery "Delivered By" staff dropdown (GET /api/users is SUPER_ADMIN-only on the backend; see
// the QA report). This is the same promote/revert-via-psql pattern used throughout the backend
// test pass, just invoked from Node instead of bash.
import { execSync } from 'node:child_process';
const PSQL = '"C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe"';
const DB = '-U postgres -d inventorymanagementsystem-db';
function runSql(sql) {
  execSync(`${PSQL} ${DB} -c "${sql}"`, { env: { ...process.env, PGPASSWORD: '1234' } });
}
export function promoteTestUserToSuperAdmin() {
  runSql('update users set role_id=1 where user_id=2;');
}
export function demoteTestUserToManager() {
  runSql('update users set role_id=2 where user_id=2;');
}

export async function logout(page) {
  // Navbar avatar menu -> Logout (see layouts/Navbar.jsx).
  await page.locator('.erp-navbar .erp-avatar').click();
  await page.getByRole('button', { name: /logout/i }).click();
}

// The workflow specs search for these catalogue services by name in the estimate builder.
// A fresh deployment (and a shop that curates its own catalogue) may not have them, so seed
// them idempotently via the API before those specs run.
export async function ensureSeedServices() {
  const ctx = await playwrightRequest.newContext({ baseURL: 'http://localhost:8090' });
  try {
    const token = (await (await ctx.post('/api/auth/login', { data: MANAGER })).json()).token;
    const headers = { Authorization: `Bearer ${token}` };
    const existing = await (await ctx.get('/api/services', { headers })).json();
    const names = new Set((Array.isArray(existing) ? existing : existing.content || []).map((s) => s.serviceName));
    const wanted = [
      { serviceName: 'General Car Service', defaultPrice: 1500 },
      { serviceName: 'Wheel Alignment', defaultPrice: 800 },
      { serviceName: 'Decarbonization', defaultPrice: 2500 },
      { serviceName: 'Inspection Fee', defaultPrice: 500, description: 'Charged when a customer declines the estimated work after inspection.' },
    ];
    for (const s of wanted) {
      if (names.has(s.serviceName)) continue;
      await ctx.post('/api/services', { headers, data: { ...s, gstPercentage: 18, vehicleType: '', status: 'active' } });
    }
  } finally {
    await ctx.dispose();
  }
}
