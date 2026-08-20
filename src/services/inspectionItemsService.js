import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/inspection-items', 'inspectionItemId');

export const inspectionItemsService = {
  ...base,
  save: (payload) => api.post('/inspection-items', payload).then((res) => res.data),
  getByJobCard: (jobCardId) => api.get(`/inspection-items/job-card/${jobCardId}`).then((res) => res.data),
};
export default inspectionItemsService;
