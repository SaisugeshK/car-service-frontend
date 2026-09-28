import { test, expect, pageTitle } from './fixtures.js';
import { SUPER_ADMIN, EMPLOYEE } from './env.js';

async function uiLogin(page, { email, password }) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole('button', { name: /^login$/i }).click();
}

// Login finished = redirected off /login (tokens are saved by then).
const loggedIn = (page) => expect(page).toHaveURL(/\/$/, { timeout: 15000 });

test.describe('Login', () => {
  test('super admin logs in and lands on the owner dashboard', { tag: '@critical' }, async ({ page }) => {
    await uiLogin(page, SUPER_ADMIN);
    await expect(page).toHaveURL(/\/$/);
    await expect(pageTitle(page)).toContainText(/dashboard/i);
    await expect(page.locator('.erp-navbar')).toContainText(SUPER_ADMIN.email);
  });

  test('employee logs in and lands on their own dashboard', { tag: '@critical' }, async ({ page }) => {
    await uiLogin(page, EMPLOYEE);
    await expect(page).toHaveURL(/\/$/);
    await expect(pageTitle(page)).toContainText(/welcome/i);
  });

  test('wrong password is rejected and stays on login', { tag: '@critical' }, async ({ page }) => {
    page.guard.allow(/status of 401|status of 400|auth\/login/);
    await uiLogin(page, { email: SUPER_ADMIN.email, password: 'WrongPassword1!' });
    await expect(page.locator('text=/invalid|incorrect|wrong/i').first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('protected page while signed out redirects to login', { tag: '@high' }, async ({ page }) => {
    await page.goto('/invoices');
    await expect(page).toHaveURL(/\/login/);
  });

  test('session survives a page reload', { tag: '@critical' }, async ({ page }) => {
    await uiLogin(page, SUPER_ADMIN);
    await loggedIn(page);
    await page.goto('/customers');
    await page.reload();
    await expect(page).toHaveURL(/\/customers/);
    await expect(pageTitle(page)).toContainText(/customers/i);
  });

  test('logout ends the session', { tag: '@critical' }, async ({ page }) => {
    await uiLogin(page, EMPLOYEE);
    await expect(page).toHaveURL(/\/$/);
    await page.locator('.erp-navbar .erp-avatar').click();
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/job-cards');
    await expect(page).toHaveURL(/\/login/);
  });
});
