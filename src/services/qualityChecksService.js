import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/quality-checks', 'qualityCheckId');

export const qualityChecksService = {
  ...base,
  getByJobCard: (jobCardId) => api.get(`/quality-checks/job-card/${jobCardId}`).then((res) => res.data),
};
export default qualityChecksService;
