import { createCrudService } from './crudServiceFactory';
export const purchaseItemsService = createCrudService('/purchase-items', 'purchaseItemId');
export default purchaseItemsService;
