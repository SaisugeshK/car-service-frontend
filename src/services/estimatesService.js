import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/estimates', 'estimateId');

export const estimatesService = {
  ...base,
  getByJobCard: (jobCardId) => api.get(`/estimates/job-card/${jobCardId}`).then((res) => res.data),
  approve: (id, approvedBy) => api.post(`/estimates/${id}/approve`, { approvedBy }).then((res) => res.data),
  reject: (id, notes) => api.post(`/estimates/${id}/reject`, { notes }).then((res) => res.data),
};
export default estimatesService;
