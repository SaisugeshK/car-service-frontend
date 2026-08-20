import { createCrudService } from './crudServiceFactory';
export const followUpsService = createCrudService('/follow-ups', 'followUpId');
export default followUpsService;
