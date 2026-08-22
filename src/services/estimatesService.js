import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/estimates', 'estimateId');

export const estimatesService = {
  ...base,
  getByJobCard: (jobCardId) => api.get(`/estimates/job-card/${jobCardId}`).then((res) => res.data),
  approve: (id, approvedBy) => api.post(`/estimates/${id}/approve`, { approvedBy }).then((res) => res.data),
  reject: (id, notes) => api.post(`/estimates/${id}/reject`, { notes }).then((res) => res.data),
  // Marks an estimate CHANGES_REQUESTED with what the customer wants changed. Does not itself
  // create a new estimate — call `revise` afterwards with the updated item list.
  requestChanges: (id, notes) => api.post(`/estimates/${id}/request-changes`, { notes }).then((res) => res.data),
  // Creates a new revision of estimate `id` (same estimateNumber, revisionNumber + 1). The
  // original row is untouched — this never overwrites it.
  revise: (id, payload) => api.post(`/estimates/${id}/revise`, payload).then((res) => res.data),
  getRevisions: (id) => api.get(`/estimates/${id}/revisions`).then((res) => res.data),
};
export default estimatesService;
