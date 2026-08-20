import { createCrudService } from './crudServiceFactory';
export const serviceMasterService = createCrudService('/services', 'serviceId');
export default serviceMasterService;
