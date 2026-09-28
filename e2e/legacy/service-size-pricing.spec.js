// Direct REST coverage for explicit per-vehicle-size service pricing:
// an estimate SERVICE line with no unitPrice is priced from the service's sizePrices row for
// the customer's vehicle size, falling back to the service's base price.
import { test, expect, request as playwrightRequest } from '@playwright/test';
import { MANAGER } from './helpers.js';

const ORIGIN = 'http://localhost:8090';

async function api() {
  const anon = await playwrightRequest.newContext({ baseURL: ORIGIN });
  const token = (await (await anon.post('/api/auth/login', { data: MANAGER })).json()).token;
  await anon.dispose();
  return playwrightRequest.newContext({ baseURL: ORIGIN, extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
}

let a;
let serviceId;
const BASE = 900;

test.beforeAll(async () => {
  a = await api();
  const res = await a.post('/api/services', {
    data: {
      serviceName: `Size Test ${Date.now()}`,
      vehicleType: 'CAR',
      defaultPrice: BASE,
      gstPercentage: 18,
      status: 'active',
      sizePrices: [
        { sizeClassCode: 'SUV', price: 3000 },
        { sizeClassCode: 'SMALL', price: 1000 },
      ],
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  serviceId = (await res.json()).serviceId;
});

test.afterAll(async () => { await a.dispose(); });

async function estimateLineUnitPrice(sizeClass, unitPrice) {
  const stamp = Date.now().toString().slice(-9) + Math.floor(Math.random() * 99);
  const customerId = (await (await a.post('/api/customers', {
    data: { customerName: `SP ${stamp}`, phone: `9${stamp}`.slice(0, 10), status: 'active' },
  })).json()).customerId;
  const vehicleId = (await (await a.post('/api/vehicles', {
    data: { customerId, vehicleModel: 'SP Car', registrationNumber: `SP${stamp}`, vehicleCategory: 'CAR', sizeClass },
  })).json()).vehicleId;
  const jobCardId = (await (await a.post('/api/job-cards', {
    data: { customerId, vehicleId, complaint: 'size price' },
  })).json()).jobCardId;

  const item = { itemType: 'SERVICE', serviceId, quantity: 1 };
  if (unitPrice != null) item.unitPrice = unitPrice;
  const res = await a.post('/api/estimates', { data: { jobCardId, customerId, items: [item] } });
  expect(res.status(), await res.text()).toBe(201);
  return Number((await res.json()).items[0].unitPrice);
}

test('service carries its size prices', async () => {
  const svc = await (await a.get(`/api/services/${serviceId}`)).json();
  const byCode = Object.fromEntries((svc.sizePrices || []).map((s) => [s.sizeClassCode, Number(s.price)]));
  expect(byCode.SUV).toBe(3000);
  expect(byCode.SMALL).toBe(1000);
});

test('estimate line uses the size price, or the base price when the size has none', async () => {
  expect(await estimateLineUnitPrice('SUV')).toBeCloseTo(3000, 2);
  expect(await estimateLineUnitPrice('SMALL')).toBeCloseTo(1000, 2);
  expect(await estimateLineUnitPrice('SEDAN')).toBeCloseTo(BASE, 2);   // SEDAN not priced → base
  expect(await estimateLineUnitPrice(null)).toBeCloseTo(BASE, 2);       // no size → base
});

test('an explicit unitPrice is never overridden', async () => {
  expect(await estimateLineUnitPrice('SUV', 55)).toBeCloseTo(55, 2);
});

test('updating a service replaces its size prices', async () => {
  const put = await a.put(`/api/services/${serviceId}`, {
    data: { defaultPrice: BASE, sizePrices: [{ sizeClassCode: 'SUV', price: 3500 }, { sizeClassCode: 'SEDAN', price: 1200 }] },
  });
  expect(put.status(), await put.text()).toBe(200);
  const svc = await (await a.get(`/api/services/${serviceId}`)).json();
  const byCode = Object.fromEntries((svc.sizePrices || []).map((s) => [s.sizeClassCode, Number(s.price)]));
  expect(byCode).toEqual({ SUV: 3500, SEDAN: 1200 });   // SMALL removed, SEDAN added, SUV changed
  expect(await estimateLineUnitPrice('SUV')).toBeCloseTo(3500, 2);
  expect(await estimateLineUnitPrice('SMALL')).toBeCloseTo(BASE, 2);   // SMALL no longer priced
});
