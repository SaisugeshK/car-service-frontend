import { createCrudService } from './crudServiceFactory';
export const serviceRemindersService = createCrudService('/service-reminders', 'reminderId');
export default serviceRemindersService;
