import api from '../api/axios';

// Read-only compliance trail (Phase 30) — SUPER_ADMIN only, enforced both here (route guard,
// sidebar) and on the backend (SecurityConfig hasRole("SUPER_ADMIN") on /api/audit-logs/**).
export const auditLogsService = {
  getAll: (entityType) => api.get('/audit-logs', { params: entityType ? { entityType } : undefined }).then((res) => res.data),
};
export default auditLogsService;
