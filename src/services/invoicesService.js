import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/invoices', 'invoiceId');

export const invoicesService = {
  ...base,
  cancel: (id) => api.post(`/invoices/${id}/cancel`).then((res) => res.data),
};
export default invoicesService;
