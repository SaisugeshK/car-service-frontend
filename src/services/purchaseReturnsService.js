import { createCrudService } from './crudServiceFactory';
export const purchaseReturnsService = createCrudService('/purchase-returns', 'purchaseReturnId');
export default purchaseReturnsService;
