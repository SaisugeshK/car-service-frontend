import { createCrudService } from './crudServiceFactory';
export const rolesService = createCrudService('/roles', 'roleId');
export default rolesService;
