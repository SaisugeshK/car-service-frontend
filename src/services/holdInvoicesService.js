import { createCrudService } from './crudServiceFactory';
export const holdInvoicesService = createCrudService('/hold-invoices', 'holdId');
export default holdInvoicesService;
