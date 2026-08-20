import { createCrudService } from './crudServiceFactory';
export const settingsService = createCrudService('/settings', 'settingId');
export default settingsService;
