// Direct API access for test setup, cleanup and server-side permission checks — so UI tests can
// start from known data and leave nothing behind, and role checks don't rely on the UI alone.
import { request } from '@playwright/test';
import { API_URL, SUPER_ADMIN, EMPLOYEE } from './env.js';

export const uniq = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`.toUpperCase();
// Unique, valid-looking 10-digit mobile and registration for test records.
export const testPhone = () => `9${String(Date.now()).slice(-9)}`;
export const testPlate = () => `E2E${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 10)}`;

export async function loginApi(creds) {
  const ctx = await request.newContext({ baseURL: API_URL });
  const res = await ctx.post('/api/auth/login', { data: creds });
  if (!res.ok()) throw new Error(`API login failed for ${creds.email}: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  await ctx.dispose();
  return body;
}

export class Api {
  static async as(creds) {
    const body = await loginApi(creds);
    const api = new Api();
    api.token = body.token || body.accessToken;
    api.user = body;
    api.ctx = await request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${api.token}` },
    });
    return api;
  }

  static superAdmin() { return Api.as(SUPER_ADMIN); }

  static employee() { return Api.as(EMPLOYEE); }

  // Returns { status, body } — never throws on HTTP errors, so tests can assert 403s.
  async call(method, path, data) {
    const res = await this.ctx.fetch(`/api${path}`, { method, data });
    const text = await res.text();
    let body = text;
    try { body = text ? JSON.parse(text) : null; } catch { /* plain-text body */ }
    return { status: res.status(), body };
  }

  get(path) { return this.call('GET', path); }

  post(path, data) { return this.call('POST', path, data); }

  put(path, data) { return this.call('PUT', path, data); }

  del(path) { return this.call('DELETE', path); }

  // POST that must succeed — for fixtures.
  async create(path, data) {
    const { status, body } = await this.post(path, data);
    if (status >= 300) throw new Error(`POST ${path} failed: ${status} ${JSON.stringify(body)}`);
    return body;
  }

  async dispose() { await this.ctx?.dispose(); }
}

export const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

// A customer + vehicle made through the API, named so they're recognisable as test data.
export async function createCustomerWithVehicle(api, { name, category = 'CAR' } = {}) {
  const tag = uniq();
  const customer = await api.create('/customers', {
    customerName: name || `E2E Customer ${tag}`, phone: testPhone(), status: 'active',
  });
  const vehicle = await api.create('/vehicles', {
    customerId: customer.customerId, make: 'E2E', vehicleModel: `Model ${tag}`,
    registrationNumber: testPlate(), vehicleCategory: category,
  });
  return { customer, vehicle };
}

// Deletes, in dependency order, whatever a test created. Best-effort: logs but never throws, so a
// failed cleanup never masks the real test result.
export async function cleanup(api, { visits = [], jobCards = [], appointments = [], vehicles = [], customers = [], expenses = [], complaints = [], services = [], categories = [] }) {
  const run = async (path) => {
    const { status } = await api.del(path);
    if (status >= 400 && status !== 404) console.warn(`cleanup: DELETE ${path} -> ${status}`);
  };
  for (const id of visits) await run(`/visits/${id}`);
  for (const id of jobCards) await run(`/job-cards/${id}`);
  for (const id of appointments) await run(`/appointments/${id}`);
  for (const id of complaints) await run(`/complaints/${id}`);
  for (const id of expenses) await run(`/expenses/${id}`);
  for (const id of vehicles) await run(`/vehicles/${id}`);
  for (const id of customers) await run(`/customers/${id}`);
  for (const id of services) await run(`/services/${id}`);
  for (const id of categories) await run(`/categories/${id}`);
}

export { SUPER_ADMIN, EMPLOYEE };
