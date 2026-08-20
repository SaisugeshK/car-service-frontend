import { createCrudService } from './crudServiceFactory';
export const usersService = createCrudService('/users', 'userId');
export default usersService;
