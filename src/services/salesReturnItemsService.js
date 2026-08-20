import { createCrudService } from './crudServiceFactory';
export const salesReturnItemsService = createCrudService('/sales-return-items', 'salesReturnItemId');
export default salesReturnItemsService;
