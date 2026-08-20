import { createCrudService } from './crudServiceFactory';
export const productsService = createCrudService('/products', 'productId');
export default productsService;
