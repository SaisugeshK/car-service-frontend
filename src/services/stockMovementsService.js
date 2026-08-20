import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/stock-movements', 'movementId');

export const stockMovementsService = {
  ...base,
  getByProductId: (productId) =>
    api.get(`/stock-movements/${productId}`).then((res) => res.data),
};
export default stockMovementsService;
