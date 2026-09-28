# End-to-end tests (Playwright)

Real browser → Vite dev server → Spring backend → PostgreSQL. Nothing is mocked.

## Before running

1. Backend running on `http://localhost:8090`.
2. Frontend dev server running on `http://localhost:5174` (`npm run dev -- --port 5174`).
3. The two accounts exist: `superadmin@example.com` (SUPER_ADMIN) and `arjun.tech@example.com` (EMPLOYEE).

Override any of these with environment variables: `E2E_BASE_URL`, `E2E_API_URL`,
`E2E_SA_EMAIL`, `E2E_SA_PASSWORD`, `E2E_EMP_EMAIL`, `E2E_EMP_PASSWORD`.

## Running

```bash
npm run test:e2e             # Chromium, Firefox and WebKit
npm run test:e2e:chromium    # one browser — fastest
npx playwright test e2e/05-billing.spec.js --project=chromium   # one file
npm run test:e2e:report      # open the HTML report
```

Results:
- `playwright-report/` — HTML report with screenshots, video and trace for every failure.
- `e2e-results/findings.md` — failures grouped by severity (see below).

## What every test also checks

Every page opened in a test is watched. The test **fails** on:
- any browser console error (including failed API calls such as a 403 the page shouldn't be making),
- any uncaught JavaScript error,
- any 5xx response from the API.

Console warnings don't fail the test; they're attached to the report for review.

## Severity

Each test is tagged; a failure is reported under its tag in `findings.md`:

| Tag | Meaning |
|---|---|
| `@critical` | Core functionality broken — can't log in, data not saving, billing wrong |
| `@high` | Wrong role permissions — e.g. an employee can see revenue or another user's data |
| `@medium` | UI problems — a page not rendering, pagination, console errors |
| `@low` | Cosmetic |

## Coverage

| File | Module | What it checks |
|---|---|---|
| `01-auth` | Login | Both roles log in, wrong password rejected, reload keeps session, logout, signed-out redirect |
| `02-rbac-and-pages` | All screens | Every page loads cleanly for each role; employee redirected from 19 admin screens; sidebar per role; 28 API calls refused to employee; dashboard revenue shown to admin only |
| `03-customers-vehicles` | Customers, Vehicles | Add customer + vehicle, search, edit, delete, pagination, unique registration (ignoring spaces/case), employee read-only, employee profile has no billing |
| `04-workshop` | Appointments, Job Cards, Workshop Board, Inspections | Appointment → job card → assign technician → board → employee updates status; employee blocked from unassigned job cards, can't cancel/reassign; inspections readable by assigned employee only |
| `05-billing` | Job card billing, Offers, Invoices | Add service → offer auto-applied → pay by UPI → invoice total equals the amount shown; fake coupons rejected; coupon codes shown; invoices admin-only |
| `06-visits` | Customer Visits | Employee logs a walk-in (creates customer + vehicle); plate matched however typed; New → Occasional → Regular; badges and visit history; employee can't delete visits; reports; status filter |
| `07-expenses` | Expenses | Employee adds expense with receipt, sees only their own and no totals; admin sees all + reports; bad input rejected |
| `08-catalog-inventory` | Services, Products, Categories, Stock, Purchases, Suppliers | Admin adds/deletes category, adds supplier; employee read-only everywhere |
| `09-complaints-crm` | Complaints, Reminders, Follow-ups, Reviews, Offers | Employee logs a complaint, admin sees and can edit it; CRM screens manageable by admin |
| `10-payroll-attendance` | Payroll, Attendance | Employee sees and downloads own payslips, own attendance/leave/overtime; blocked from everyone else's; admin payroll screens open |
| `11-reports-settings` | Reports, Settings, Users, Roles, Audit Log | Screens open for admin; exactly two roles exist; employee refused by the API |

## Test data

Tests create their own records, all named `E2E ...`, and delete them afterwards. Two things can't be
deleted and are left behind on purpose:
- the billing test's invoice is **cancelled** (invoices are never deleted), so its job card, customer
  and vehicle stay;
- nothing touches business settings, users, roles or payroll — those tests are read-only.

`e2e/legacy/` holds the previous suite (written for the retired MANAGER role and the old multi-step
job card). It is excluded from runs and kept only for reference.
