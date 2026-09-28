import api from '../api/axios';

// Visits drive a customer's New / Occasional / Regular status (worked out on the server).
export const visitsService = {
  // SUPER_ADMIN: every visit. EMPLOYEE: the visits they handled.
  getAll: () => api.get('/visits').then((res) => res.data),
  getByCustomer: (customerId) => api.get(`/visits/customer/${customerId}`).then((res) => res.data),
  // Who/what a mobile + registration resolves to, before logging.
  lookup: (phone, registrationNumber) =>
    api.get('/visits/lookup', { params: { phone, registrationNumber }, skipErrorToast: true }).then((res) => res.data),
  log: (payload) => api.post('/visits', payload).then((res) => res.data),
  remove: (id) => api.delete(`/visits/${id}`).then((res) => res.data),
};

export const VISIT_PURPOSES = [
  { value: 'SERVICE', label: 'Service' },
  { value: 'REPAIR', label: 'Repair' },
  { value: 'INQUIRY', label: 'Inquiry' },
  { value: 'INSURANCE_RENEWAL', label: 'Insurance Renewal' },
  { value: 'OTHER', label: 'Other' },
];

export const purposeLabel = (v) => VISIT_PURPOSES.find((p) => p.value === v)?.label || v;

// Mirrors CustomerVisitStatsService on the backend.
export const REGULAR_STATUS = {
  REGULAR: { label: 'Regular Customer', short: 'Regular', icon: '⭐', badge: 'bg-warning text-dark' },
  OCCASIONAL: { label: 'Occasional Customer', short: 'Occasional', icon: '🕑', badge: 'bg-info text-dark' },
  NEW: { label: 'New Customer', short: 'New', icon: '🆕', badge: 'bg-light text-dark border' },
};

export default visitsService;
