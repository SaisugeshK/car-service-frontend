import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

const base = createCrudService('/offers', 'offerId');

export const offersService = {
  ...base,
  // Sends the offer to every eligible customer via WhatsApp or SMS — real per-customer
  // NotificationLog rows get created, honestly resolving to NOT_CONFIGURED/FAILED until a
  // provider is wired in. Never claims delivery that didn't happen.
  launch: (id, channel) => api.post(`/offers/${id}/launch`, { channel }).then((res) => res.data),
  getCampaigns: (id) => api.get(`/offers/${id}/campaigns`).then((res) => res.data),
};
export default offersService;
