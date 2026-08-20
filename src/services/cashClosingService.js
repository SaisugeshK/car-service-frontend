import { createCrudService } from './crudServiceFactory';
export const cashClosingService = createCrudService('/cash-closing', 'closingId');
export default cashClosingService;
