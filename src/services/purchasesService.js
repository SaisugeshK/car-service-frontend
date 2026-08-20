import { createCrudService } from './crudServiceFactory';
export const purchasesService = createCrudService('/purchases', 'purchaseId');
export default purchasesService;
