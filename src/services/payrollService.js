import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/payroll', 'salaryPaymentId');

export const payrollService = {
  ...base,
  // year/month omitted -> backend defaults to the previous calendar month (pay-in-arrears).
  // userId narrows generation to a single employee (catch-up).
  generate: (params) => api.post('/payroll/generate', null, { params }).then((res) => res.data),
  markPaid: (id, payload) => api.put(`/payroll/${id}/mark-paid`, payload).then((res) => res.data),
  cancel: (id, payload) => api.put(`/payroll/${id}/cancel`, payload).then((res) => res.data),
  // The authenticated employee's own payslip history — the backend derives whose it is from the
  // JWT, never from anything sent here.
  myPayslips: () => api.get('/payroll/my').then((res) => res.data),
};
export default payrollService;
