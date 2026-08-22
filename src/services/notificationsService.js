import api from '../api/axios';

// No WhatsApp/SMS provider is configured on the backend yet — every send resolves to
// { status: 'NOT_CONFIGURED' } (or 'FAILED' with no recipient number). Never treat a resolved
// promise here as "message delivered" — always read response.status.
export const notificationsService = {
  send: (payload) => api.post('/notifications/send', payload).then((res) => res.data),
  getByReference: (referenceType, referenceId) =>
    api.get(`/notifications/reference/${referenceType}/${referenceId}`).then((res) => res.data),
  getAll: () => api.get('/notifications').then((res) => res.data),
};
export default notificationsService;
