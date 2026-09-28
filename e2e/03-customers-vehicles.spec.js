import { test, expect, settled, pageTitle, pageSearch } from './fixtures.js';
import { asList, cleanup, createCustomerWithVehicle, testPhone, testPlate, uniq } from './api.js';

const findCustomer = async (api, name) => asList((await api.get('/customers')).body).find((c) => c.customerName === name);

test.describe('Customers & Vehicles', () => {
  test('super admin adds a customer with a vehicle, finds it by search', { tag: '@critical' }, async ({ superAdminPage: page, saApi }) => {
    const name = `E2E Customer ${uniq()}`;
    const plate = testPlate();
    try {
      await page.goto('/customers');
      await settled(page);
      await page.getByRole('button', { name: /add customer & vehicle/i }).click();
      await page.locator('#cvm-customerName').fill(name);
      await page.locator('#cvm-phone').fill(testPhone());
      await page.locator('#cvm-make').fill('E2E');
      await page.locator('#cvm-model').fill('Test Model');
      await page.locator('#cvm-category').selectOption('CAR');
      await page.locator('#cvm-reg').fill(plate);
      await page.getByRole('button', { name: /save customer & vehicle/i }).click();
      // Saving opens the new customer's profile.
      await expect(page).toHaveURL(/\/customers\/\d+/);
      await expect(pageTitle(page)).toContainText(name);
      await expect(pageTitle(page)).toContainText(/new customer/i); // 🆕 badge — no visits yet
      const saved = await findCustomer(saApi, name);
      const vehicles = asList((await saApi.get(`/vehicles/customer/${saved.customerId}`)).body);
      expect(vehicles.map((v) => v.registrationNumber)).toContain(plate);

      await page.goto('/customers');
      await settled(page);
      await pageSearch(page).fill(name);
      await expect(page.locator('tbody tr', { hasText: name })).toHaveCount(1);
    } finally {
      const c = await findCustomer(saApi, name);
      if (c) {
        const vehicles = asList((await saApi.get(`/vehicles/customer/${c.customerId}`)).body);
        await cleanup(saApi, { vehicles: vehicles.map((v) => v.vehicleId), customers: [c.customerId] });
      }
    }
  });

  test('super admin edits and deletes a customer', { tag: '@critical' }, async ({ superAdminPage: page, saApi }) => {
    const name = `E2E Edit ${uniq()}`;
    const customer = await saApi.create('/customers', { customerName: name, phone: testPhone(), status: 'active' });
    try {
      await page.goto('/customers');
      await settled(page);
      await pageSearch(page).fill(name);
      const row = page.locator('tbody tr', { hasText: name });
      await row.getByTitle('Edit').click();
      await page.locator('.modal #city').fill('E2E City');
      await page.locator('.modal').getByRole('button', { name: /^save$/i }).click();
      await expect(row).toContainText('E2E City');

      await row.getByTitle('Delete').click();
      await page.locator('.modal').getByRole('button', { name: /^delete$/i }).click();
      await expect(page.locator('tbody tr', { hasText: name })).toHaveCount(0);
      expect((await saApi.get(`/customers/${customer.customerId}`)).status).toBe(404);
    } finally {
      await cleanup(saApi, { customers: [customer.customerId] });
    }
  });

  test('customer list paginates', { tag: '@medium' }, async ({ superAdminPage: page }) => {
    await page.goto('/customers');
    await settled(page);
    const next = page.getByRole('button', { name: 'Next page' });
    test.skip(await next.isDisabled(), 'only one page of customers');
    const firstRowBefore = await page.locator('tbody tr').first().innerText();
    await next.click();
    await expect(page.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('tbody tr').first()).not.toHaveText(firstRowBefore);
  });

  test('registration number must be unique, ignoring spaces and case', { tag: '@high' }, async ({ saApi }) => {
    const { customer, vehicle } = await createCustomerWithVehicle(saApi);
    try {
      const plate = vehicle.registrationNumber;
      const spaced = `${plate.slice(0, 3).toLowerCase()} ${plate.slice(3)}`;
      const dup = await saApi.post('/vehicles', { customerId: customer.customerId, vehicleModel: 'Dup', registrationNumber: spaced });
      expect(dup.status).toBe(400);
    } finally {
      await cleanup(saApi, { vehicles: [vehicle.vehicleId], customers: [customer.customerId] });
    }
  });

  test('vehicles page finds a vehicle by plate', { tag: '@medium' }, async ({ superAdminPage: page, saApi }) => {
    const { customer, vehicle } = await createCustomerWithVehicle(saApi);
    try {
      await page.goto('/vehicles');
      await settled(page);
      await pageSearch(page).fill(vehicle.registrationNumber);
      await expect(page.locator('tbody tr', { hasText: vehicle.registrationNumber })).toHaveCount(1);
    } finally {
      await cleanup(saApi, { vehicles: [vehicle.vehicleId], customers: [customer.customerId] });
    }
  });

  test('employee sees customers read-only', { tag: '@high' }, async ({ employeePage: page }) => {
    await page.goto('/customers');
    await settled(page);
    await expect(page.locator('tbody tr').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /add customer/i })).toHaveCount(0);
    await expect(page.getByTitle('Edit')).toHaveCount(0);
    await expect(page.getByTitle('Delete')).toHaveCount(0);
  });

  test('employee customer profile hides billing and money', { tag: '@high' }, async ({ employeePage: page, saApi }) => {
    const { customer, vehicle } = await createCustomerWithVehicle(saApi);
    try {
      await page.goto(`/customers/${customer.customerId}`);
      await settled(page);
      await expect(page.getByRole('button', { name: 'Visit History' })).toBeVisible();
      for (const tab of ['Invoices', 'Payments', 'Estimates', 'Offers']) {
        await expect(page.getByRole('button', { name: tab, exact: true })).toHaveCount(0);
      }
      await expect(page.getByText(/total spent|outstanding/i)).toHaveCount(0);
    } finally {
      await cleanup(saApi, { vehicles: [vehicle.vehicleId], customers: [customer.customerId] });
    }
  });
});
