import { createCrudService } from './crudServiceFactory';
export const billingCountersService = createCrudService('/billing-counters', 'counterId');
export default billingCountersService;
