import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/attendance', 'attendanceId');

export const attendanceService = {
  ...base,
  // The logged-in user's own records — the server picks the user from the JWT.
  getMine: () => api.get('/attendance/my').then((res) => res.data),
};
export default attendanceService;
