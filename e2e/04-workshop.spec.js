// Appointment -> job card -> technician assignment -> workshop board -> employee updates status.
// Plus: employees only reach the job cards / inspections assigned to them.
import dayjs from 'dayjs';
import { test, expect, settled, pageTitle } from './fixtures.js';
import { asList, cleanup, createCustomerWithVehicle } from './api.js';

test.describe('Workshop', () => {
  test('appointment -> job card -> assign technician -> employee updates status', { tag: '@critical' }, async ({ superAdminPage: sa, employeePage: emp, saApi, empApi }) => {
    const { customer, vehicle } = await createCustomerWithVehicle(saApi);
    const created = { jobCards: [], appointments: [], vehicles: [vehicle.vehicleId], customers: [customer.customerId] };
    try {
      // 1. Super admin books an appointment in the UI.
      await sa.goto('/appointments');
      await settled(sa);
      await sa.getByRole('button', { name: /new appointment/i }).click();
      const modal = sa.locator('.modal');
      await modal.locator('select').first().selectOption(String(customer.customerId));
      await modal.locator('select').nth(1).selectOption(String(vehicle.vehicleId));
      await modal.locator('input[type="date"]').fill(dayjs().format('YYYY-MM-DD'));
      await modal.getByRole('button', { name: /book appointment/i }).click();
      await expect(modal).toHaveCount(0);
      const appointment = asList((await saApi.get('/appointments')).body).find((a) => a.vehicleId === vehicle.vehicleId);
      expect(appointment, 'appointment saved').toBeTruthy();
      created.appointments.push(appointment.appointmentId);

      // 2. Convert it to a job card.
      await sa.locator('tbody tr', { hasText: customer.customerName }).getByRole('button', { name: /convert/i }).click();
      await expect(sa).toHaveURL(/\/job-cards\/\d+/);
      const jobCardId = Number(sa.url().split('/').pop());
      created.jobCards.push(jobCardId);

      // 3. Assign the employee as technician and save.
      await sa.locator('#jc-technician').selectOption(String(empApi.user.userId));
      await sa.getByRole('button', { name: /^save$/i }).click();
      await expect(sa.getByText(/job card saved/i)).toBeVisible();

      // 4. It shows on the workshop board.
      const jobCard = (await saApi.get(`/job-cards/${jobCardId}`)).body;
      await sa.goto('/workshop-board');
      await settled(sa);
      await expect(sa.getByText(jobCard.jobCardNumber).first()).toBeVisible();

      // 5. Employee sees it in their list and moves it to In Progress.
      await emp.goto('/job-cards');
      await settled(emp);
      await emp.locator('tbody tr', { hasText: jobCard.jobCardNumber }).click();
      await expect(pageTitle(emp)).toContainText(jobCard.jobCardNumber);
      await expect(emp.getByText(/final payable/i)).toHaveCount(0); // no billing for employees
      await emp.locator('#emp-status').selectOption('IN_PROGRESS');
      await emp.locator('#emp-work').fill('E2E: replaced brake pads');
      await emp.getByRole('button', { name: /^save$/i }).click();
      await expect(emp.getByText(/job card updated/i)).toBeVisible();

      const after = (await saApi.get(`/job-cards/${jobCardId}`)).body;
      expect(after.status).toBe('IN_PROGRESS');
      expect(after.workRequired).toBe('E2E: replaced brake pads');
    } finally {
      await cleanup(saApi, created);
    }
  });

  test('employee cannot open, update or cancel a job card not assigned to them', { tag: '@high' }, async ({ saApi, empApi }) => {
    const { customer, vehicle } = await createCustomerWithVehicle(saApi);
    const jc = await saApi.create('/job-cards', { customerId: customer.customerId, vehicleId: vehicle.vehicleId, complaint: 'E2E unassigned' });
    try {
      expect((await empApi.get(`/job-cards/${jc.jobCardId}`)).status).toBe(403);
      expect((await empApi.put(`/job-cards/${jc.jobCardId}`, { status: 'IN_PROGRESS' })).status).toBe(403);
      expect(asList((await empApi.get('/job-cards')).body).some((j) => j.jobCardId === jc.jobCardId)).toBe(false);

      // Even on an assigned card, an employee can't cancel it or reassign it.
      await saApi.put(`/job-cards/${jc.jobCardId}`, { technicianUserId: empApi.user.userId });
      expect((await empApi.call('PATCH', `/job-cards/${jc.jobCardId}/status`, { status: 'CANCELLED' })).status).toBe(403);
      await empApi.put(`/job-cards/${jc.jobCardId}`, { technicianUserId: 1, complaint: 'hijacked' });
      const after = (await saApi.get(`/job-cards/${jc.jobCardId}`)).body;
      expect(after.technicianUserId).toBe(empApi.user.userId);
      expect(after.complaint).toBe('E2E unassigned');
    } finally {
      await cleanup(saApi, { jobCards: [jc.jobCardId], vehicles: [vehicle.vehicleId], customers: [customer.customerId] });
    }
  });

  test('inspection results are readable by the assigned employee only, and read-only', { tag: '@high' }, async ({ saApi, empApi, employeePage: emp }) => {
    const { customer, vehicle } = await createCustomerWithVehicle(saApi);
    const mine = await saApi.create('/job-cards', { customerId: customer.customerId, vehicleId: vehicle.vehicleId, technicianUserId: empApi.user.userId, complaint: 'E2E inspection' });
    const other = await saApi.create('/job-cards', { customerId: customer.customerId, vehicleId: vehicle.vehicleId, complaint: 'E2E other' });
    try {
      await saApi.create('/inspection-items', { jobCardId: mine.jobCardId, category: 'ENGINE', status: 'GOOD', notes: 'E2E ok' });
      const read = await empApi.get(`/inspection-items/job-card/${mine.jobCardId}`);
      expect(read.status).toBe(200);
      expect(asList(read.body).some((i) => i.category === 'ENGINE')).toBe(true);
      expect((await empApi.get(`/inspection-items/job-card/${other.jobCardId}`)).status).toBe(403);
      expect((await empApi.post('/inspection-items', { jobCardId: mine.jobCardId, category: 'BRAKES', status: 'GOOD' })).status).toBe(403);

      await emp.goto('/inspections');
      await settled(emp);
      await expect(emp.getByText(mine.jobCardNumber).first()).toBeVisible();
      await expect(emp.getByText(other.jobCardNumber)).toHaveCount(0);
    } finally {
      await cleanup(saApi, { jobCards: [mine.jobCardId, other.jobCardId], vehicles: [vehicle.vehicleId], customers: [customer.customerId] });
    }
  });
});
