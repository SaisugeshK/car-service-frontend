import api from '../api/axios';

/**
 * Builds a standard set of REST calls for a given base path.
 * Every module (Suppliers, Categories, Units, Settings, ...) that exposes a
 * plain GET/POST/PUT/DELETE CRUD API on the Spring Boot backend can reuse
 * this instead of re-writing the same axios calls.
 *
 * The backend never returns a plain `id` field — every response DTO names its
 * primary key after the entity (`productId`, `customerId`, `supplierId`, ...).
 * Pages that build a dropdown from one entity's list to reference it from
 * another (e.g. Purchases picking a Supplier, Purchase Items picking a
 * Purchase) rely on `.id` existing, so without this every such dropdown binds
 * to `undefined` and silently submits nothing. `idKey` tells the factory
 * which field to mirror onto `.id` on every object it returns, so callers can
 * use `.id` (or the real field name — both stay populated) safely everywhere.
 *
 * @param {string} basePath e.g. "/suppliers"
 * @param {string} [idKey] the entity's real primary-key field, e.g. "supplierId"
 */
export function createCrudService(basePath, idKey) {
  const withId = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    if (!idKey || obj.id !== undefined || obj[idKey] === undefined) return obj;
    return { ...obj, id: obj[idKey] };
  };

  const normalize = (data) => {
    if (Array.isArray(data)) return data.map(withId);
    if (data && Array.isArray(data.content)) return { ...data, content: data.content.map(withId) };
    return withId(data);
  };

  return {
    getAll: (params) => api.get(basePath, { params }).then((res) => normalize(res.data)),
    getById: (id) => api.get(`${basePath}/${id}`).then((res) => withId(res.data)),
    create: (payload) => api.post(basePath, payload).then((res) => withId(res.data)),
    update: (id, payload) => api.put(`${basePath}/${id}`, payload).then((res) => withId(res.data)),
    remove: (id) => api.delete(`${basePath}/${id}`).then((res) => res.data),
  };
}

export default createCrudService;
