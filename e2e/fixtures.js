// Shared test fixtures:
//  - Every page (page / superAdminPage / employeePage) carries a console guard: the test fails on
//    any browser console error, uncaught page error or 5xx API response; warnings are attached to
//    the report for review. A test that deliberately triggers an error (e.g. wrong password -> 401)
//    calls page.guard.allow(/pattern/).
//  - superAdminPage / employeePage: a page already signed in as that role (see global-setup.js).
//  - saApi / empApi: API clients signed in as each role, for setup, cleanup and permission checks.
/* eslint-disable react-hooks/rules-of-hooks -- Playwright's fixture `use()` is not a React hook */
import { test as base, expect } from '@playwright/test';
import { Api } from './api.js';
import { STATE, API_URL } from './env.js';

// The app's own origins: the frontend and the API. Load failures from anywhere else are third-party.
const APP_ORIGINS = [new URL(process.env.E2E_BASE_URL || 'http://localhost:5174').origin, new URL(API_URL).origin];

function attachGuard(page, testInfo) {
  const errors = [];
  const warnings = [];
  const allowed = [];
  const isAllowed = (text) => allowed.some((re) => re.test(text));

  // A resource from another site (e.g. Google Fonts) failing to download is the network, not the
  // app — recorded as a warning. Anything from the app or its API still fails the test.
  const isThirdPartyLoadFailure = (msg) => {
    const url = msg.location()?.url || '';
    return /failed to load resource/i.test(msg.text()) && url && !APP_ORIGINS.some((o) => url.startsWith(o));
  };

  page.on('console', (msg) => {
    const text = `${msg.text()}${msg.location()?.url ? `  (${msg.location().url})` : ''}`;
    if (msg.type() === 'error' && isThirdPartyLoadFailure(msg)) { warnings.push(`third-party load failure: ${text}`); return; }
    if (msg.type() === 'error' && !isAllowed(text)) errors.push(`console.error: ${text}`);
    if (msg.type() === 'warning') warnings.push(text);
  });
  page.on('pageerror', (err) => {
    if (!isAllowed(String(err))) errors.push(`uncaught page error: ${err.message}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 500 && res.url().includes('/api/') && !isAllowed(res.url())) {
      errors.push(`server error ${res.status()} on ${res.request().method()} ${res.url()}`);
    }
  });

  return {
    allow: (re) => allowed.push(re),
    async verify() {
      if (warnings.length) {
        await testInfo.attach('console-warnings.txt', { body: [...new Set(warnings)].join('\n'), contentType: 'text/plain' });
      }
      if (errors.length) {
        await testInfo.attach('console-errors.txt', { body: errors.join('\n'), contentType: 'text/plain' });
      }
      expect(errors, `Browser console / server errors during this test:\n${errors.join('\n')}`).toEqual([]);
    },
  };
}

export const test = base.extend({
  // The default (signed-out) `page`, guarded the same way — used by the login tests.
  page: async ({ page }, use, testInfo) => {
    const guard = attachGuard(page, testInfo);
    page.guard = guard;
    await use(page);
    await guard.verify();
  },

  superAdminPage: async ({ browser }, use, testInfo) => {
    const context = await browser.newContext({ storageState: STATE.superAdmin });
    const page = await context.newPage();
    const guard = attachGuard(page, testInfo);
    page.guard = guard;
    await use(page);
    await guard.verify();
    await context.close();
  },

  employeePage: async ({ browser }, use, testInfo) => {
    const context = await browser.newContext({ storageState: STATE.employee });
    const page = await context.newPage();
    const guard = attachGuard(page, testInfo);
    page.guard = guard;
    await use(page);
    await guard.verify();
    await context.close();
  },

  saApi: async ({}, use) => { // eslint-disable-line no-empty-pattern
    const api = await Api.superAdmin();
    await use(api);
    await api.dispose();
  },

  empApi: async ({}, use) => { // eslint-disable-line no-empty-pattern
    const api = await Api.employee();
    await use(api);
    await api.dispose();
  },
});

export { expect };

// Waits until a page has finished its initial data load (no "Loading..." spinner left).
export async function settled(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('text=/^Loading/i')).toHaveCount(0, { timeout: 15000 });
}

export const pageTitle = (page) => page.locator('h1.erp-page-title').first();

// The page's own search box (not the navbar's global search, which also says "Search ...").
export const pageSearch = (page) => page.locator('main.erp-content input[placeholder^="Search"]').first();

// Sidebar link labels currently visible.
export async function sidebarLabels(page) {
  return page.locator('.erp-sidebar-nav .erp-sidebar-link').allInnerTexts().then((t) => t.map((s) => s.trim()));
}
