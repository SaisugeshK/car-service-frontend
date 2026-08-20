import { createCrudService } from './crudServiceFactory';
export const suppliersService = createCrudService('/suppliers', 'supplierId');
export default suppliersService;
