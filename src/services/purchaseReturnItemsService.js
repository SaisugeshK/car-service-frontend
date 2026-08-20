import { createCrudService } from './crudServiceFactory';
export const purchaseReturnItemsService = createCrudService('/purchase-return-items', 'purchaseReturnItemId');
export default purchaseReturnItemsService;
