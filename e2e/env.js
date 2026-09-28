// Credentials and URLs for the E2E suite. Defaults match the local dev setup; override with env vars
// (never commit real production credentials here).
export const API_URL = process.env.E2E_API_URL || 'http://localhost:8090';

export const SUPER_ADMIN = {
  email: process.env.E2E_SA_EMAIL || 'superadmin@example.com',
  password: process.env.E2E_SA_PASSWORD || 'SuperAdmin1!',
};

export const EMPLOYEE = {
  email: process.env.E2E_EMP_EMAIL || 'arjun.tech@example.com',
  password: process.env.E2E_EMP_PASSWORD || 'Employee123!',
};

// Browser session files written by global-setup.js (one login per role per run).
export const STATE = {
  superAdmin: 'e2e-results/.auth/super-admin.json',
  employee: 'e2e-results/.auth/employee.json',
};
