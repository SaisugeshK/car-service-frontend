import { createCrudService } from './crudServiceFactory';
export const customersService = createCrudService('/customers', 'customerId');
export default customersService;
