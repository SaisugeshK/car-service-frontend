import api from '../api/axios';
import { createCrudService } from './crudServiceFactory';

// In-app staff notification center (Phase 29) — distinct from notificationsService.js, which is
// the outbound WhatsApp/SMS log to *customers*. This is "things that happened in the system that
// staff should know about" (new job, estimate approved, low stock, ...), shared/unread state.
const base = createCrudService('/notification-events', 'notificationEventId');

export const notificationEventsService = {
  ...base,
  getUnreadCount: () => api.get('/notification-events/unread-count').then((res) => res.data?.unreadCount ?? 0),
  markRead: (id) => api.post(`/notification-events/${id}/read`).then((res) => res.data),
  markAllRead: () => api.post('/notification-events/read-all').then((res) => res.data),
};
export default notificationEventsService;
