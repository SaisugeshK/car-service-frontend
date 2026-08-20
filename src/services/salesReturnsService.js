import { createCrudService } from './crudServiceFactory';
export const salesReturnsService = createCrudService('/sales-returns', 'returnId');
export default salesReturnsService;
