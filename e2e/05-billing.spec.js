// Job card billing end to end: add a service, offer applied automatically, pay, invoice created —
// and the amount on screen is exactly what the server stored.
import { test, expect, settled } from './fixtures.js';
import { asList, cleanup, createCustomerWithVehicle, uniq } from './api.js';

const money = (s) => Number(String(s).replace(/[^0-9.]/g, ''));

test.describe('Billing', () => {
  test('job card -> add service -> pay by UPI -> paid invoice matches the screen', { tag: '@critical' }, async ({ superAdminPage: page, saApi }) => {
    const { customer, vehicle } = await createCustomerWithVehicle(saApi);
    const serviceName = `E2E Service ${uniq()}`;
    const service = await saApi.create('/services', { serviceName, defaultPrice: 1000, gstPercentage: 18, vehicleType: '', status: 'active' });
    const jc = await saApi.create('/job-cards', { customerId: customer.customerId, vehicleId: vehicle.vehicleId, complaint: 'E2E billing' });
    let invoiceId = null;
    try {
      await page.goto(`/job-cards/${jc.jobCardId}`);
      await settled(page);
      await page.getByPlaceholder(/search service to add/i).fill(serviceName);
      await page.getByRole('button', { name: new RegExp(serviceName) }).click();

      const finalPayable = page.getByRole('button', { name: /final payable/i });
      await expect(finalPayable).toContainText(/\d/);
      // Offers are checked against the bill automatically; wait for that to settle.
      await expect(page.getByText(/checking offers/i)).toHaveCount(0);
      await page.waitForTimeout(800);
      const shownTotal = money(await finalPayable.locator('strong.fs-4').innerText());
      expect(shownTotal).toBeGreaterThan(0);
      expect(shownTotal).toBeLessThanOrEqual(1180);

      await page.getByRole('button', { name: /^payment$/i }).click();
      const modal = page.locator('.modal');
      await modal.getByRole('radio', { name: 'UPI' }).click();
      await modal.getByRole('button', { name: /^paid$/i }).click();
      await expect(page.getByText(/invoice .* created/i)).toBeVisible();

      const after = (await saApi.get(`/job-cards/${jc.jobCardId}`)).body;
      invoiceId = after.invoiceId;
      expect(invoiceId, 'job card linked to an invoice').toBeTruthy();
      expect(after.status).toBe('READY_FOR_DELIVERY');
      const invoice = (await saApi.get(`/invoices/${invoiceId}`)).body;
      expect(invoice.paymentStatus).toBe('PAID');
      expect(invoice.paymentMethod).toBe('UPI');
      expect(Number(invoice.grandTotal)).toBeCloseTo(shownTotal, 2);
      await expect(page.getByText(invoice.invoiceNumber).first()).toBeVisible();
    } finally {
      // An invoice is never deleted — cancel it so the test leaves no revenue behind. The job card
      // stays (it's invoiced); it's named "E2E ..." so it's recognisable.
      if (invoiceId) await saApi.post(`/invoices/${invoiceId}/cancel`);
      else await cleanup(saApi, { jobCards: [jc.jobCardId] });
      await cleanup(saApi, { services: [service.serviceId] });
      if (!invoiceId) await cleanup(saApi, { vehicles: [vehicle.vehicleId], customers: [customer.customerId] });
    }
  });

  test('a coupon code is validated by the server — made-up codes are rejected', { tag: '@high' }, async ({ saApi }) => {
    const res = await saApi.post('/offers/validate-coupon', { couponCode: `NOPE${uniq()}`, billAmount: 5000, vehicleType: 'CAR' });
    expect(res.status).toBe(200);
    expect(res.body.eligible).toBe(false);
    expect(res.body.message).toMatch(/invalid coupon/i);
  });

  test('offers page shows auto-generated coupon codes', { tag: '@medium' }, async ({ superAdminPage: page, saApi }) => {
    const offer = await saApi.create('/offers', { offerName: `E2E Offer ${uniq()}`, discountType: 'FIXED_AMOUNT', discountValue: 50, status: 'ACTIVE' });
    try {
      expect(offer.couponCode).toMatch(/^E2EOFFER/);
      await page.goto('/offers');
      await settled(page);
      await expect(page.getByText(offer.couponCode)).toBeVisible();
    } finally {
      await saApi.del(`/offers/${offer.offerId}`);
    }
  });

  test('invoices list loads for super admin and is refused to employee', { tag: '@high' }, async ({ superAdminPage: page, empApi }) => {
    await page.goto('/invoices');
    await settled(page);
    await expect(page.locator('tbody tr').first()).toBeVisible();
    expect((await empApi.get('/invoices')).status).toBe(403);
    expect(asList((await empApi.get('/job-cards')).body).every((j) => !('grandTotal' in j))).toBe(true);
  });
});
