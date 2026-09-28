// Every screen, both roles: it renders, shows the right title, and produces no console errors or
// server errors. Plus the permission boundary — in the UI and, independently, in the API.
import { test, expect, settled, pageTitle, sidebarLabels } from './fixtures.js';
import { SUPER_ADMIN_ROUTES, EMPLOYEE_ROUTES, ADMIN_ONLY_ROUTES, EMPLOYEE_FORBIDDEN_API } from './routes.js';

test.describe('Every page loads cleanly — super admin', () => {
  for (const route of SUPER_ADMIN_ROUTES) {
    test(`${route.path}`, { tag: '@medium' }, async ({ superAdminPage: page }) => {
      await page.goto(route.path);
      await settled(page);
      await expect(page).toHaveURL(new RegExp(`${route.path === '/' ? '/$' : route.path}`));
      await expect(pageTitle(page)).toContainText(route.title);
      await expect(page.locator('text=/could not load/i')).toHaveCount(0);
    });
  }
});

test.describe('Every allowed page loads cleanly — employee', () => {
  for (const route of EMPLOYEE_ROUTES) {
    test(`${route.path}`, { tag: '@medium' }, async ({ employeePage: page }) => {
      await page.goto(route.path);
      await settled(page);
      await expect(pageTitle(page)).toContainText(route.title);
      await expect(page.locator('text=/could not load/i')).toHaveCount(0);
    });
  }
});

test.describe('Employee is kept out of admin screens (UI)', () => {
  for (const route of ADMIN_ONLY_ROUTES) {
    test(`${route.path} redirects to the employee dashboard`, { tag: '@high' }, async ({ employeePage: page }) => {
      await page.goto(route.path);
      await expect(page).toHaveURL(/\/$/);
      await expect(pageTitle(page)).toContainText(/welcome/i);
    });
  }

  test('sidebar shows only employee items', { tag: '@high' }, async ({ employeePage: page }) => {
    await page.goto('/');
    await settled(page);
    const labels = await sidebarLabels(page);
    for (const hidden of ['Invoices', 'Estimates', 'Payments', 'Offers', 'Payroll Runs', 'Employee Salary', 'Reports', 'Users', 'Business Settings', 'Audit Log']) {
      expect(labels, `employee sidebar must not show "${hidden}"`).not.toContain(hidden);
    }
    for (const shown of ['Job Cards', 'Customers', 'My Expenses', 'My Visits', 'My Payslips', 'Complaints']) {
      expect(labels.some((l) => l.includes(shown)), `employee sidebar should show "${shown}"`).toBe(true);
    }
  });

  test('no global search or notifications for employee', { tag: '@high' }, async ({ employeePage: page }) => {
    await page.goto('/');
    await settled(page);
    await expect(page.locator('.erp-navbar input[placeholder*="Search"]')).toHaveCount(0);
  });

  test('super admin sidebar shows every section', { tag: '@high' }, async ({ superAdminPage: page }) => {
    await page.goto('/');
    await settled(page);
    const labels = await sidebarLabels(page);
    for (const shown of ['Invoices', 'Offers', 'Expenses', 'Customer Visits', 'Payroll Runs', 'Reports', 'Users', 'Audit Log']) {
      expect(labels.some((l) => l.includes(shown)), `super admin sidebar should show "${shown}"`).toBe(true);
    }
  });
});

test.describe('Employee is refused by the API (server-side)', () => {
  for (const [method, path] of EMPLOYEE_FORBIDDEN_API) {
    test(`${method} /api${path} -> 403`, { tag: '@high' }, async ({ empApi }) => {
      const { status } = await empApi.call(method, path, method === 'GET' ? undefined : {});
      expect(status).toBe(403);
    });
  }
});

test.describe('Dashboard revenue visibility', () => {
  test('super admin sees revenue and expense figures', { tag: '@high' }, async ({ superAdminPage: page }) => {
    await page.goto('/');
    await settled(page);
    await expect(page.getByText(/monthly revenue/i)).toBeVisible();
    await expect(page.getByText(/expenses this month/i)).toBeVisible();
  });

  test('employee dashboard shows no revenue or salary', { tag: '@high' }, async ({ employeePage: page }) => {
    await page.goto('/');
    await settled(page);
    const text = await page.locator('main, .erp-main, body').first().innerText();
    expect(text).not.toMatch(/revenue/i);
    expect(text).not.toMatch(/net pay|gross|salary/i);
    await expect(page.getByText(/my job cards/i)).toBeVisible();
    await expect(page.getByText(/my expenses/i).first()).toBeVisible();
  });
});
