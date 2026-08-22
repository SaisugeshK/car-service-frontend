import { createCrudService } from './crudServiceFactory';

export const complaintsService = createCrudService('/complaints', 'complaintId');
export default complaintsService;
