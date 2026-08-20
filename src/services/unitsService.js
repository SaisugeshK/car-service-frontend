import { createCrudService } from './crudServiceFactory';
export const unitsService = createCrudService('/units', 'unitId');
export default unitsService;
