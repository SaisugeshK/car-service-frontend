import { createCrudService } from './crudServiceFactory';
export const salesItemsService = createCrudService('/sales-items', 'saleItemId');
export default salesItemsService;
