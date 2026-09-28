import { defineConfig, devices } from '@playwright/test';

// End-to-end suite: real browser -> real Vite dev server -> real Spring backend -> real database.
// Nothing is mocked. Tests create their own data (named "E2E ...") and delete it afterwards.
//
//   npm run test:e2e                      all browsers
//   npx playwright test --project=chromium
//   E2E_BASE_URL / E2E_API_URL / E2E_SA_EMAIL / E2E_SA_PASSWORD / E2E_EMP_EMAIL / E2E_EMP_PASSWORD
//   override the defaults in e2e/env.js.
//
// Results: playwright-report/ (HTML) and e2e-results/findings.md (failures by severity).
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5174';

export default defineConfig({
  testDir: './e2e',
  // e2e/legacy/ is the pre-v2 suite (MANAGER role, multi-step job card) — kept for reference only.
  testIgnore: ['**/legacy/**'],
  globalSetup: './e2e/global-setup.js',
  // One shared dev database — run serially so tests never race each other's data.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['./e2e/severity-reporter.js', { outputFile: 'e2e-results/findings.md' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
  ],
});
