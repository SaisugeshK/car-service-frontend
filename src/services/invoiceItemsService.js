import { createCrudService } from './crudServiceFactory';
export const invoiceItemsService = createCrudService('/invoice-items', 'invoiceItemId');
export default invoiceItemsService;
