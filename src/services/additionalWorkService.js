import api from '../api/axios';

// Work a technician finds mid-service, outside the original estimate — its own approve/reject
// cycle. Only APPROVED requests are ever pulled into the final invoice.
export const additionalWorkService = {
  create: (payload) => api.post('/additional-work', payload).then((res) => res.data),
  getByJobCard: (jobCardId) => api.get(`/additional-work/job-card/${jobCardId}`).then((res) => res.data),
  getAll: () => api.get('/additional-work').then((res) => res.data),
  approve: (id, decidedBy) => api.post(`/additional-work/${id}/approve`, { decidedBy }).then((res) => res.data),
  reject: (id, decidedBy) => api.post(`/additional-work/${id}/reject`, { decidedBy }).then((res) => res.data),
};
export default additionalWorkService;
