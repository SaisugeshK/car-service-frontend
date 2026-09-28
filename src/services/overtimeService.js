import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/overtime', 'overtimeId');

export const overtimeService = {
  ...base,
  approve: (id) => api.put(`/overtime/${id}/approve`).then((res) => res.data),
  reject: (id) => api.put(`/overtime/${id}/reject`).then((res) => res.data),
  // The logged-in user's own entries — the server picks the user from the JWT.
  getMine: () => api.get('/overtime/my').then((res) => res.data),
};
export default overtimeService;
