import { test, expect, settled, pageSearch } from './fixtures.js';
import { asList, cleanup, uniq } from './api.js';

test.describe('Catalog & Inventory', () => {
  test('super admin adds and deletes a category', { tag: '@critical' }, async ({ superAdminPage: page, saApi }) => {
    const name = `E2E Category ${uniq()}`;
    try {
      await page.goto('/categories');
      await settled(page);
      await page.getByRole('button', { name: /add category/i }).click();
      await page.locator('.modal #categoryName').fill(name);
      await page.locator('.modal').getByRole('button', { name: /^save$/i }).click();
      await pageSearch(page).fill(name);
      const row = page.locator('tbody tr', { hasText: name });
      await expect(row).toHaveCount(1);
      await row.getByTitle('Delete').click();
      await page.locator('.modal').getByRole('button', { name: /^delete$/i }).click();
      await expect(page.locator('tbody tr', { hasText: name })).toHaveCount(0);
    } finally {
      const left = asList((await saApi.get('/categories')).body).find((c) => c.categoryName === name);
      if (left) await cleanup(saApi, { categories: [left.categoryId] });
    }
  });

  test('super admin adds a supplier', { tag: '@high' }, async ({ superAdminPage: page, saApi }) => {
    const name = `E2E Supplier ${uniq()}`;
    try {
      await page.goto('/suppliers');
      await settled(page);
      await page.getByRole('button', { name: /add supplier/i }).click();
      await page.locator('.modal #supplierName').fill(name);
      await page.locator('.modal #phone').fill('9876500000');
      await page.locator('.modal').getByRole('button', { name: /^save$/i }).click();
      await pageSearch(page).fill(name);
      await expect(page.locator('tbody tr', { hasText: name })).toHaveCount(1);
    } finally {
      const s = asList((await saApi.get('/suppliers')).body).find((x) => x.supplierName === name);
      if (s) await saApi.del(`/suppliers/${s.supplierId}`);
    }
  });

  for (const path of ['/service-master', '/products', '/categories', '/suppliers']) {
    test(`employee sees ${path} read-only`, { tag: '@high' }, async ({ employeePage: page }) => {
      await page.goto(path);
      await settled(page);
      await expect(page.getByRole('button', { name: /^add /i })).toHaveCount(0);
      await expect(page.getByTitle('Edit')).toHaveCount(0);
      await expect(page.getByTitle('Delete')).toHaveCount(0);
    });
  }

  test('employee sees stock, purchases and adjustments without write buttons', { tag: '@high' }, async ({ employeePage: page }) => {
    await page.goto('/stock');
    await settled(page);
    await expect(page.getByRole('button', { name: /adjust stock/i })).toHaveCount(0);
    await page.goto('/purchases');
    await settled(page);
    await expect(page.getByRole('button', { name: /new purchase/i })).toHaveCount(0);
    await page.goto('/stock-adjustments');
    await settled(page);
    await expect(page.getByRole('button', { name: /new adjustment/i })).toHaveCount(0);
  });

  test('super admin sees write buttons on inventory', { tag: '@medium' }, async ({ superAdminPage: page }) => {
    await page.goto('/purchases');
    await settled(page);
    await expect(page.getByRole('button', { name: /new purchase/i })).toBeVisible();
    await page.goto('/stock-adjustments');
    await settled(page);
    await expect(page.getByRole('button', { name: /new adjustment/i })).toBeVisible();
  });
});
