import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/job-cards', 'jobCardId');

export const jobCardsService = {
  ...base,
  createFromAppointment: (appointmentId) =>
    api.post(`/job-cards/from-appointment/${appointmentId}`).then((res) => res.data),
  updateStatus: (id, status) => api.patch(`/job-cards/${id}/status`, { status }).then((res) => res.data),
  generateInvoice: (id, payload) => api.post(`/job-cards/${id}/generate-invoice`, payload).then((res) => res.data),
  deliver: (id) => api.post(`/job-cards/${id}/deliver`).then((res) => res.data),
};
export default jobCardsService;
