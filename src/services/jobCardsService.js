import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/job-cards', 'jobCardId');

export const jobCardsService = {
  ...base,
  createFromAppointment: (appointmentId) =>
    api.post(`/job-cards/from-appointment/${appointmentId}`).then((res) => res.data),
  updateStatus: (id, status) => api.patch(`/job-cards/${id}/status`, { status }).then((res) => res.data),
  generateInvoice: (id, payload) => api.post(`/job-cards/${id}/generate-invoice`, payload).then((res) => res.data),
  // Customer rejected the estimate — bills only the inspection fee. The server refuses this if
  // any estimate for the job card is still APPROVED or awaiting a decision.
  generateInspectionFeeInvoice: (id, payload) => api.post(`/job-cards/${id}/generate-inspection-fee-invoice`, payload).then((res) => res.data),
  // checklist: { deliveredByUserId, vehicleCleaned, belongingsChecked, keysReady } — the server
  // refuses delivery if any of it is missing, this isn't just a frontend gate.
  deliver: (id, checklist) => api.post(`/job-cards/${id}/deliver`, checklist).then((res) => res.data),
  getStatusHistory: (id) => api.get(`/job-cards/${id}/status-history`).then((res) => res.data),
};
export default jobCardsService;
