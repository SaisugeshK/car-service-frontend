import { test, expect, settled, pageSearch } from './fixtures.js';
import { asList, cleanup, createCustomerWithVehicle, uniq } from './api.js';

test.describe('Complaints & Customer Relationship', () => {
  test('employee logs a complaint; super admin sees it', { tag: '@critical' }, async ({ employeePage: emp, superAdminPage: sa, saApi }) => {
    const { customer, vehicle } = await createCustomerWithVehicle(saApi);
    const description = `E2E complaint ${uniq()} — AC not cooling`;
    const created = { complaints: [], vehicles: [vehicle.vehicleId], customers: [customer.customerId] };
    try {
      await emp.goto('/complaints');
      await settled(emp);
      await emp.getByRole('button', { name: /add complaint/i }).click();
      const modal = emp.locator('.modal');
      await modal.locator('#customerId').selectOption(String(customer.customerId));
      await modal.locator('#description').fill(description);
      await modal.getByRole('button', { name: /^save$/i }).click();
      await expect(modal).toHaveCount(0);
      await expect(emp.getByTitle('Edit')).toHaveCount(0); // log, not edit

      const complaint = asList((await saApi.get('/complaints')).body).find((c) => c.description === description);
      expect(complaint, 'complaint saved').toBeTruthy();
      created.complaints.push(complaint.complaintId);

      await sa.goto('/complaints');
      await settled(sa);
      await pageSearch(sa).fill('E2E complaint');
      const row = sa.locator('tbody tr', { hasText: 'AC not cooling' }).first();
      await expect(row).toBeVisible();
      await expect(row.getByTitle('Edit')).toBeVisible();
    } finally {
      await cleanup(saApi, created);
    }
  });

  for (const path of ['/service-reminders', '/follow-ups', '/reviews', '/offers']) {
    test(`super admin can manage ${path}`, { tag: '@medium' }, async ({ superAdminPage: page }) => {
      await page.goto(path);
      await settled(page);
      await expect(page.getByRole('button', { name: /^(add|new|create)/i }).first()).toBeVisible();
    });
  }
});
