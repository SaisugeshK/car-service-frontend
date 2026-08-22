// Shared helpers for the production E2E suite — real browser, real backend (localhost:8090),
// real Vite dev server (localhost:5173). Nothing here mocks the network.

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
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
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
