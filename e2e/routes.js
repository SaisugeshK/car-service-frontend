// Every screen in the app and who may open it. Keep in sync with layouts/Sidebar.jsx (employee:
// true) and config/SecurityConfig.java.
export const EMPLOYEE_ROUTES = [
  { path: '/', title: /welcome/i },
  { path: '/appointments', title: /appointments/i },
  { path: '/job-cards', title: /job cards/i },
  { path: '/workshop-board', title: /workshop/i },
  { path: '/inspections', title: /inspection/i },
  { path: '/customers', title: /customers/i },
  { path: '/vehicles', title: /vehicles/i },
  { path: '/visits', title: /my visits/i },
  { path: '/service-master', title: /service/i },
  { path: '/products', title: /products/i },
  { path: '/categories', title: /categories/i },
  { path: '/stock', title: /stock/i },
  { path: '/purchases', title: /purchases/i },
  { path: '/suppliers', title: /suppliers/i },
  { path: '/stock-adjustments', title: /stock adjustments/i },
  { path: '/expenses', title: /my expenses/i },
  { path: '/complaints', title: /complaints/i },
  { path: '/my-attendance', title: /my attendance/i },
  { path: '/my-payslips', title: /my payslips/i },
];

// SUPER_ADMIN only — an employee opening any of these must be sent back to their dashboard.
export const ADMIN_ONLY_ROUTES = [
  { path: '/estimates', title: /estimates/i },
  { path: '/invoices', title: /invoices/i },
  { path: '/payments', title: /payments/i },
  { path: '/returns', title: /returns/i },
  { path: '/service-reminders', title: /reminders/i },
  { path: '/follow-ups', title: /follow/i },
  { path: '/reviews', title: /reviews/i },
  { path: '/offers', title: /offers/i },
  { path: '/attendance', title: /attendance/i },
  { path: '/leave-requests', title: /leave/i },
  { path: '/overtime', title: /overtime/i },
  { path: '/employee-salary', title: /salary/i },
  { path: '/payroll', title: /payroll/i },
  { path: '/reports', title: /reports/i },
  { path: '/settings', title: /settings/i },
  { path: '/product-taxes', title: /tax/i },
  { path: '/users', title: /users/i },
  { path: '/roles', title: /roles/i },
  { path: '/audit-log', title: /audit/i },
];

// Super admin sees every employee screen too (with admin titles where they differ).
export const SUPER_ADMIN_ROUTES = [
  ...EMPLOYEE_ROUTES.map((r) => ({
    ...r,
    title: { '/': /dashboard/i, '/visits': /customer visits/i, '/expenses': /^expenses/i }[r.path] || r.title,
  })),
  ...ADMIN_ONLY_ROUTES,
];

// API endpoints an employee must be refused (server-side check, independent of the UI).
export const EMPLOYEE_FORBIDDEN_API = [
  ['GET', '/invoices'], ['GET', '/payments'], ['GET', '/estimates'], ['GET', '/offers'],
  ['GET', '/service-reminders'], ['GET', '/follow-ups'], ['GET', '/reviews'],
  ['GET', '/payroll'], ['GET', '/salary-configs'], ['GET', '/attendance'], ['GET', '/leave-requests'],
  ['GET', '/overtime'], ['GET', '/users'], ['GET', '/settings'], ['GET', '/audit-logs'], ['GET', '/roles'],
  ['POST', '/customers'], ['POST', '/vehicles'], ['POST', '/job-cards'], ['POST', '/services'],
  ['POST', '/products'], ['POST', '/purchases'], ['POST', '/invoices'], ['POST', '/offers'],
  ['POST', '/service-reminders'], ['POST', '/attendance'], ['POST', '/payroll/generate'],
  ['POST', '/auth/register'],
];
