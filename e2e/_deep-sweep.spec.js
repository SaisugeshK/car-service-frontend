// Deployment deep-sweep: visit every route as SUPER_ADMIN and assert no console errors,
// no uncaught page errors, and no failed network requests on any of them.
import { test, expect } from '@playwright/test';
import { login, collectConsoleAndNetwork, promoteTestUserToSuperAdmin, demoteTestUserToManager } from './helpers.js';

const ROUTES = [
  '/', '/appointments', '/job-cards', '/workshop-board', '/inspections',
  '/customers', '/vehicles',
  '/service-master', '/products', '/categories',
  '/stock', '/purchases', '/suppliers', '/stock-adjustments', '/stock-movements',
  '/estimates', '/invoices', '/payments', '/returns', '/hold-invoices',
  '/service-reminders', '/follow-ups', '/reviews', '/offers', '/complaints',
  '/product-taxes', '/units', '/barcodes', '/billing-counters', '/cash-closing',
  '/pos', '/sales', '/purchase-returns',
  '/attendance', '/leave-requests', '/overtime', '/employee-salary', '/payroll', '/my-payslips',
  '/reports', '/settings', '/users', '/roles', '/audit-log',
];

test('every route loads clean for SUPER_ADMIN', async ({ page }) => {
  test.setTimeout(180000);
  promoteTestUserToSuperAdmin();
  const problems = [];
  try {
    const { consoleErrors, pageErrors, failedRequests } = collectConsoleAndNetwork(page);
    await login(page);
    for (const route of ROUTES) {
      consoleErrors.length = 0; pageErrors.length = 0; failedRequests.length = 0;
      await page.goto(route);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(400);
      // a rendered page has SOME heading/content, never a blank white screen
      const bodyText = (await page.locator('body').innerText().catch(() => '')).trim();
      if (bodyText.length < 20) problems.push(`${route}: blank page`);
      if (/something went wrong|error boundary|failed to fetch/i.test(bodyText)) problems.push(`${route}: error text on page`);
      if (consoleErrors.length) problems.push(`${route}: console errors: ${consoleErrors.join(' | ')}`);
      if (pageErrors.length) problems.push(`${route}: page errors: ${pageErrors.join(' | ')}`);
      if (failedRequests.length) problems.push(`${route}: failed requests: ${failedRequests.join(' | ')}`);
    }
  } finally {
    demoteTestUserToManager();
  }
  expect(problems, `\n${problems.join('\n')}\n`).toEqual([]);
});

test('job card detail — all 8 tabs render clean', async ({ page }) => {
  test.setTimeout(90000);
  const { consoleErrors, pageErrors, failedRequests } = collectConsoleAndNetwork(page);
  await login(page);
  await page.goto('/job-cards');
  await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
  const row = page.locator('table tbody tr').first();
  test.skip(await row.count() === 0, 'no job cards to open');
  await row.click();
  await expect(page).toHaveURL(/\/job-cards\/\d+/, { timeout: 8000 });
  for (const tab of ['Overview', 'Complaint', 'Inspection', 'Estimate', 'Technician', 'Additional Work', 'Quality Check', 'Invoice']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await page.waitForTimeout(500);
  }
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  expect(failedRequests, failedRequests.join('\n')).toEqual([]);
});
