import { createCrudService } from './crudServiceFactory';
export const attendanceService = createCrudService('/attendance', 'attendanceId');
export default attendanceService;
