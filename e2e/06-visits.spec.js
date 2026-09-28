// Regular-customer tracking: log visits by mobile + registration, status moves New -> Occasional
// -> Regular automatically, badges show in the UI.
import { test, expect, settled, pageTitle } from './fixtures.js';
import { asList, cleanup, testPhone, testPlate, uniq } from './api.js';

test.describe('Customer Visits', () => {
  test('employee logs a walk-in (new customer + vehicle); 3 visits make them Regular', { tag: '@critical' }, async ({ employeePage: emp, superAdminPage: sa, saApi }) => {
    const name = `E2E Walkin ${uniq()}`;
    const phone = testPhone();
    const plate = testPlate();
    const created = { visits: [], vehicles: [], customers: [] };
    try {
      await emp.goto('/visits');
      await settled(emp);
      await emp.getByRole('button', { name: /log visit/i }).click();
      await emp.locator('#lv-phone').fill(phone);
      await emp.locator('#lv-reg').fill(plate);
      await expect(emp.getByText(/new customer — will be created/i)).toBeVisible();
      await emp.locator('#lv-name').fill(name);
      await emp.locator('#lv-model').fill('E2E Scooter');
      await emp.locator('#lv-cat').selectOption('BIKE');
      await emp.locator('#lv-purpose').selectOption('INQUIRY');
      await emp.getByRole('button', { name: /^log visit$/i }).last().click();
      await expect(emp.getByText(/visit logged for/i)).toBeVisible();
      await expect(emp.locator('tbody tr', { hasText: name })).toHaveCount(1);

      const customer = asList((await saApi.get('/customers')).body).find((c) => c.customerName === name);
      expect(customer.regularStatus).toBe('NEW');
      expect(customer.totalVisits).toBe(1);
      created.customers.push(customer.customerId);
      const vehicle = asList((await saApi.get(`/vehicles/customer/${customer.customerId}`)).body)[0];
      created.vehicles.push(vehicle.vehicleId);

      // Same plate typed differently -> same vehicle, no duplicate.
      const second = await saApi.create('/visits', { phone, registrationNumber: plate.toLowerCase().replace(/^(...)/, '$1 '), purpose: 'SERVICE' });
      expect(second.createdCustomer).toBe(false);
      expect(second.createdVehicle).toBe(false);
      expect(second.customerRegularStatus).toBe('OCCASIONAL');
      const third = await saApi.create('/visits', { customerId: customer.customerId, vehicleId: vehicle.vehicleId, purpose: 'REPAIR' });
      expect(third.customerRegularStatus).toBe('REGULAR');

      created.visits.push(...asList((await saApi.get(`/visits/customer/${customer.customerId}`)).body).map((v) => v.visitId));

      await sa.goto(`/customers/${customer.customerId}`);
      await settled(sa);
      await expect(pageTitle(sa)).toContainText(/regular customer/i);
      await sa.getByRole('button', { name: 'Visit History' }).click();
      await expect(sa.locator('table tbody tr')).toHaveCount(3);
    } finally {
      await cleanup(saApi, created);
    }
  });

  test('employee can log visits but cannot delete them', { tag: '@high' }, async ({ saApi, empApi }) => {
    const v = await empApi.create('/visits', { phone: testPhone(), registrationNumber: testPlate(), customerName: `E2E Del ${uniq()}`, vehicleModel: 'X', purpose: 'OTHER' });
    try {
      expect((await empApi.del(`/visits/${v.visitId}`)).status).toBe(403);
      expect(asList((await empApi.get('/visits')).body).some((x) => x.visitId === v.visitId)).toBe(true);
    } finally {
      await cleanup(saApi, { visits: [v.visitId], vehicles: [v.vehicleId], customers: [v.customerId] });
    }
  });

  test('super admin visit reports render', { tag: '@medium' }, async ({ superAdminPage: page }) => {
    await page.goto('/visits');
    await settled(page);
    await page.getByRole('button', { name: 'Reports' }).click();
    await expect(page.getByText(/top regular customers/i)).toBeVisible();
    await expect(page.getByText(/visit frequency by vehicle/i)).toBeVisible();
    await expect(page.getByText(/common visit purposes/i)).toBeVisible();
  });

  test('customers list filters by status', { tag: '@medium' }, async ({ superAdminPage: page }) => {
    await page.goto('/customers');
    await settled(page);
    await page.getByRole('button', { name: /🆕 new/i }).click();
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    for (let i = 0; i < Math.min(count, 5); i += 1) {
      await expect(rows.nth(i)).toContainText(/new/i);
    }
  });
});
