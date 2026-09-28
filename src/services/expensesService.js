import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/expenses', 'expenseId');

// The server scopes every call: a SUPER_ADMIN gets all expenses, an EMPLOYEE only their own.
export const expensesService = {
  ...base,
  uploadReceipt: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/expenses/${id}/receipt`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data);
  },
  // Fetched as a blob through axios so the Bearer header goes along (a bare link can't carry it).
  getReceiptBlob: (id) => api.get(`/expenses/${id}/receipt`, { responseType: 'blob' }).then((res) => res.data),
  removeReceipt: (id) => api.delete(`/expenses/${id}/receipt`).then((res) => res.data),
};

export const EXPENSE_CATEGORIES = [
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'RENT', label: 'Rent' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'SUPPLIES', label: 'Supplies' },
  { value: 'MISCELLANEOUS', label: 'Miscellaneous' },
];

export const EXPENSE_PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

export const categoryLabel = (v) => EXPENSE_CATEGORIES.find((c) => c.value === v)?.label || v;
export const paymentMethodLabel = (v) => EXPENSE_PAYMENT_METHODS.find((m) => m.value === v)?.label || v;

export default expensesService;
