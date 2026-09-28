// Car vs Bike aware forms and job-card checklists.
import { test, expect, request as playwrightRequest } from '@playwright/test';
import { login, MANAGER } from './helpers.js';

const ORIGIN = 'http://localhost:8090';

async function api() {
  const anon = await playwrightRequest.newContext({ baseURL: ORIGIN });
  const token = (await (await anon.post('/api/auth/login', { data: MANAGER })).json()).token;
  await anon.dispose();
  return playwrightRequest.newContext({ baseURL: ORIGIN, extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
}

test('bike job card: checklists show bike items, not car-only ones', async ({ page }) => {
  const a = await api();
  const stamp = Date.now().toString().slice(-9);
  const customerId = (await (await a.post('/api/customers', {
    data: { customerName: `Bike ${stamp}`, phone: `9${stamp}`.slice(0, 10), status: 'active' },
  })).json()).customerId;
  const vehicleId = (await (await a.post('/api/vehicles', {
    data: { customerId, vehicleModel: 'Activa', registrationNumber: `BIKE${stamp}`, vehicleCategory: 'BIKE' },
  })).json()).vehicleId;
  const jobCardId = (await (await a.post('/api/job-cards', {
    data: { customerId, vehicleId, complaint: 'bike service' },
  })).json()).jobCardId;
  expect((await (await a.get(`/api/job-cards/${jobCardId}`)).json()).vehicleCategory).toBe('BIKE');
  await a.dispose();

  await login(page);
  await page.goto(`/job-cards/${jobCardId}`);

  await page.getByRole('button', { name: 'Inspection', exact: true }).click();
  await expect(page.getByText('Chain & Sprocket', { exact: true })).toBeVisible({ timeout: 8000 });
  await expect(page.getByText('Clutch', { exact: true })).toBeVisible();
  await expect(page.getByText('Interior', { exact: true })).toHaveCount(0);
  await expect(page.getByText('AC / Cooling', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Quality Check', exact: true }).click();
  await expect(page.getByText('Chain Tension & Lube', { exact: true })).toBeVisible({ timeout: 8000 });
  await expect(page.locator('label[for="qc-AC"]')).toHaveCount(0);
});

test('Add Customer & Vehicle modal: type fields gate on category', async ({ page }) => {
  await login(page);
  await page.goto('/customers');
  await page.getByRole('button', { name: /add customer & vehicle/i }).click();

  const vType = page.getByLabel('Vehicle Type');
  const size = page.getByLabel(/Size \(affects service pricing\)/i);
  await expect(vType).toBeDisabled();
  await expect(size).toBeDisabled();

  await page.getByLabel(/Category \(Car \/ Bike\)/i).selectOption('BIKE');
  await expect(vType).toBeEnabled();
  await expect(vType.locator('option', { hasText: 'Scooter' })).toHaveCount(1);
  await expect(vType.locator('option', { hasText: 'Hatchback' })).toHaveCount(0);
  await expect(size).toBeEnabled();
  await expect(size.locator('option', { hasText: 'Premium' })).toHaveCount(1);
  await expect(size.locator('option', { hasText: 'Luxury' })).toHaveCount(0);

  await page.getByLabel(/Category \(Car \/ Bike\)/i).selectOption('CAR');
  await expect(vType.locator('option', { hasText: 'Hatchback' })).toHaveCount(1);
  await expect(vType.locator('option', { hasText: 'Scooter' })).toHaveCount(0);
  await expect(size.locator('option', { hasText: 'MUV' })).toHaveCount(1);
  await expect(size.locator('option', { hasText: 'Premium' })).toHaveCount(0);
});
