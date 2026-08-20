import { createCrudService } from './crudServiceFactory';
export const productTaxesService = createCrudService('/product-taxes', 'taxId');
export default productTaxesService;
