import { createCrudService } from './crudServiceFactory';
export const categoriesService = createCrudService('/categories', 'categoryId');
export default categoriesService;
