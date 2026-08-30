import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/leave-requests', 'leaveId');

export const leaveRequestsService = {
  ...base,
  approve: (id) => api.put(`/leave-requests/${id}/approve`).then((res) => res.data),
  reject: (id) => api.put(`/leave-requests/${id}/reject`).then((res) => res.data),
};
export default leaveRequestsService;
