import { createCrudService } from './crudServiceFactory';
export const salesService = createCrudService('/sales', 'saleId');
export default salesService;
