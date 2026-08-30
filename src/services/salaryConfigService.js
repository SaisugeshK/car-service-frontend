import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/salary-configs', 'salaryConfigId');

export const salaryConfigService = {
  ...base,
  // No physical delete on this resource — the backend's DELETE deactivates instead (active=false)
  // so payroll history/audit trail stays intact. remove() still works: CrudPage/useCrud call it
  // on the delete-confirm action, and the backend interprets DELETE as "deactivate".
  getByUserId: (userId) => api.get(`/salary-configs/user/${userId}`).then((res) => res.data),
};
export default salaryConfigService;
