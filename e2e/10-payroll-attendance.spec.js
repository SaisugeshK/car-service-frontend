// Read-only against payroll data — nothing here generates, pays or cancels salary.
import { test, expect, settled, pageTitle } from './fixtures.js';
import { asList } from './api.js';

test.describe('Payroll & Attendance', () => {
  test('employee sees their own payslips and can download one', { tag: '@critical' }, async ({ employeePage: page, empApi }) => {
    const mine = asList((await empApi.get('/payroll/my')).body);
    await page.goto('/my-payslips');
    await settled(page);
    await expect(pageTitle(page)).toContainText(/my payslips/i);
    if (mine.length === 0) {
      await expect(page.getByText(/no payslips yet/i)).toBeVisible();
      return;
    }
    await expect(page.locator('tbody tr')).toHaveCount(Math.min(mine.length, 50));
    expect(mine.every((p) => p.userId === empApi.user.userId)).toBe(true);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /download/i }).first().click();
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test('employee sees own attendance, leave and overtime', { tag: '@high' }, async ({ employeePage: page, empApi }) => {
    for (const path of ['/attendance/my', '/leave-requests/my', '/overtime/my']) {
      const { status, body } = await empApi.get(path);
      expect(status).toBe(200);
      expect(asList(body).every((r) => r.userId === empApi.user.userId)).toBe(true);
    }
    await page.goto('/my-attendance');
    await settled(page);
    await expect(page.getByText('Present', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Leave' }).click();
    await settled(page);
    await page.getByRole('button', { name: 'Overtime' }).click();
    await settled(page);
  });

  test('employee cannot read other people’s attendance or payroll', { tag: '@high' }, async ({ empApi }) => {
    expect((await empApi.get('/attendance')).status).toBe(403);
    expect((await empApi.get('/attendance?userId=1')).status).toBe(403);
    expect((await empApi.get('/payroll')).status).toBe(403);
    expect((await empApi.get('/salary-configs')).status).toBe(403);
    expect((await empApi.post('/payroll/generate')).status).toBe(403);
  });

  test('super admin payroll screens list staff', { tag: '@high' }, async ({ superAdminPage: page }) => {
    for (const path of ['/employee-salary', '/payroll', '/attendance']) {
      await page.goto(path);
      await settled(page);
      await expect(page.locator('text=/could not load/i')).toHaveCount(0);
    }
  });
});
