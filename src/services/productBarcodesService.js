import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/product-barcodes', 'barcodeId');

export const productBarcodesService = {
  ...base,
  getByProductId: (productId) =>
    api.get(`/product-barcodes/product/${productId}`).then((res) => res.data),
  scan: (barcode) =>
    api.get(`/product-barcodes/scan/${barcode}`).then((res) => res.data),
};
export default productBarcodesService;
