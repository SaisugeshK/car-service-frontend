import { createCrudService } from './crudServiceFactory';
export const appointmentsService = createCrudService('/appointments', 'appointmentId');
export default appointmentsService;
