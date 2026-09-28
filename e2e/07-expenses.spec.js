import { test, expect, settled, pageTitle } from './fixtures.js';
import { asList, cleanup, uniq } from './api.js';

const RECEIPT = { name: 'receipt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% E2E receipt\n') };

test.describe('Expenses', () => {
  test('employee records an expense with a receipt and sees only their own', { tag: '@critical' }, async ({ employeePage: page, saApi, empApi }) => {
    const title = `E2E Cleaning supplies ${uniq()}`;
    const adminOnly = await saApi.create('/expenses', { title: `E2E Admin rent ${uniq()}`, category: 'RENT', amount: 25000, paymentMethod: 'BANK_TRANSFER', expenseDate: new Date().toISOString().slice(0, 10) });
    const created = { expenses: [adminOnly.expenseId] };
    try {
      await page.goto('/expenses');
      await settled(page);
      await expect(pageTitle(page)).toContainText(/my expenses/i);
      await page.getByRole('button', { name: /add expense/i }).click();
      await page.locator('#exp-title').fill(title);
      await page.locator('#exp-category').selectOption('SUPPLIES');
      await page.locator('#exp-amount').fill('500');
      await page.locator('#exp-method').selectOption('UPI');
      await page.locator('#exp-receipt').setInputFiles(RECEIPT);
      await page.locator('.modal').getByRole('button', { name: /^save$/i }).click();
      await expect(page.getByText(/expense recorded/i)).toBeVisible();

      const row = page.locator('tbody tr', { hasText: title });
      await expect(row).toContainText('Supplies');
      await expect(row).toContainText('500');
      await expect(row.getByRole('button', { name: /view/i })).toBeVisible(); // receipt attached

      // Own entries only — never the admin's, and no business-wide total.
      await expect(page.getByText(adminOnly.title)).toHaveCount(0);
      await expect(page.getByText(/total expenses/i)).toHaveCount(0);

      const mine = asList((await empApi.get('/expenses')).body);
      const saved = mine.find((e) => e.title === title);
      created.expenses.push(saved.expenseId);
      expect(saved.createdByRole).toBe('EMPLOYEE');
      expect(saved.hasReceipt).toBe(true);
      expect(mine.some((e) => e.expenseId === adminOnly.expenseId)).toBe(false);
      expect((await empApi.get(`/expenses/${adminOnly.expenseId}`)).status).toBe(403);
      expect((await empApi.del(`/expenses/${adminOnly.expenseId}`)).status).toBe(403);
    } finally {
      await cleanup(saApi, created);
    }
  });

  test('super admin sees all expenses, totals and the expense vs revenue report', { tag: '@high' }, async ({ superAdminPage: page, saApi, empApi }) => {
    const title = `E2E Employee spend ${uniq()}`;
    const e = await empApi.create('/expenses', { title, category: 'MAINTENANCE', amount: 750, paymentMethod: 'CASH', expenseDate: new Date().toISOString().slice(0, 10) });
    try {
      await page.goto('/expenses');
      await settled(page);
      const row = page.locator('tbody tr', { hasText: title });
      await expect(row).toContainText(/employee/i); // created-by badge
      await expect(page.getByText(/total expenses/i)).toBeVisible();
      await page.getByRole('button', { name: 'Reports' }).click();
      await expect(page.getByText(/expense vs revenue/i)).toBeVisible();
      await expect(page.getByText(/expenses by category/i)).toBeVisible();
    } finally {
      await cleanup(saApi, { expenses: [e.expenseId] });
    }
  });

  test('rejects bad input', { tag: '@medium' }, async ({ empApi }) => {
    const base = { title: 'E2E bad', category: 'SUPPLIES', amount: 10, paymentMethod: 'CASH', expenseDate: '2026-01-01' };
    expect((await empApi.post('/expenses', { ...base, amount: 0 })).status).toBe(400);
    expect((await empApi.post('/expenses', { ...base, category: 'FOOD' })).status).toBe(400);
    expect((await empApi.post('/expenses', { ...base, title: '' })).status).toBe(400);
  });
});
