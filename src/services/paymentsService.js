import { createCrudService } from './crudServiceFactory';
export const paymentsService = createCrudService('/payments', 'transactionId');
export default paymentsService;
