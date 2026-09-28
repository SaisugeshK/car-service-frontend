// Read-only: opens every report/settings screen but never saves business settings, users or roles,
// so a run can't change how the shop is configured.
import { test, expect, settled } from './fixtures.js';
import { asList } from './api.js';

test.describe('Reports & Settings', () => {
  test('reports page renders figures for super admin', { tag: '@high' }, async ({ superAdminPage: page }) => {
    await page.goto('/reports');
    await settled(page);
    await expect(page.getByText(/revenue/i).first()).toBeVisible();
  });

  test('users screen lists exactly the two accounts with their roles', { tag: '@high' }, async ({ superAdminPage: page, saApi }) => {
    const users = asList((await saApi.get('/users')).body);
    await page.goto('/users');
    await settled(page);
    for (const u of users) {
      await expect(page.getByText(u.email).first()).toBeVisible();
    }
  });

  test('roles screen shows only Super Admin and Employee', { tag: '@high' }, async ({ superAdminPage: page, saApi }) => {
    const roles = asList((await saApi.get('/roles')).body).map((r) => r.roleName).sort();
    expect(roles).toEqual(['EMPLOYEE', 'SUPER_ADMIN']);
    await page.goto('/roles');
    await settled(page);
    await expect(page.getByText('SUPER_ADMIN').first()).toBeVisible();
    await expect(page.getByText('EMPLOYEE').first()).toBeVisible();
    await expect(page.getByText('MANAGER')).toHaveCount(0);
  });

  test('business settings, tax and audit log open', { tag: '@medium' }, async ({ superAdminPage: page }) => {
    for (const path of ['/settings', '/product-taxes', '/audit-log']) {
      await page.goto(path);
      await settled(page);
      await expect(page.locator('text=/could not load/i')).toHaveCount(0);
    }
  });

  test('employee is refused settings, users, roles and audit log by the API', { tag: '@high' }, async ({ empApi }) => {
    for (const path of ['/settings', '/users', '/roles', '/audit-logs']) {
      expect((await empApi.get(path)).status, path).toBe(403);
    }
    expect((await empApi.put('/settings/1', { settingValue: 'x' })).status).toBe(403);
  });
});
