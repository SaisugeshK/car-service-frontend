import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/vehicles', 'vehicleId');

export const vehiclesService = {
  ...base,
  getByCustomer: (customerId) => api.get(`/vehicles/customer/${customerId}`).then((res) => res.data),
};
export default vehiclesService;
