import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

/**
 * Wires a createCrudService(...)-shaped service to state + toasts so pages
 * don't repeat the same fetch/create/update/delete boilerplate.
 *
 * @param {object} service  { getAll, getById, create, update, remove }
 * @param {object} options  { autoLoad = true, entityName = 'record' }
 */
export default function useCrud(service, options = {}) {
  const { autoLoad = true, entityName = 'record' } = options;
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const normalize = (data) => {
    // Spring Boot paginated responses often come back as { content: [...] }
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.content)) return data.content;
    if (data && Array.isArray(data.data)) return data.data;
    return data ? [data] : [];
  };

  const load = useCallback(
    async (params) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await service.getAll(params);
        setItems(normalize(data));
        return data;
      } catch (err) {
        setError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [service]
  );

  useEffect(() => {
    if (autoLoad) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async (payload) => {
    setIsSaving(true);
    try {
      const created = await service.create(payload);
      toast.success(`${entityName} created successfully`);
      await load();
      return created;
    } finally {
      setIsSaving(false);
    }
  };

  const update = async (id, payload) => {
    setIsSaving(true);
    try {
      const updated = await service.update(id, payload);
      toast.success(`${entityName} updated successfully`);
      await load();
      return updated;
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id) => {
    setIsSaving(true);
    try {
      await service.remove(id);
      toast.success(`${entityName} deleted successfully`);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } finally {
      setIsSaving(false);
    }
  };

  return { items, isLoading, isSaving, error, load, create, update, remove, setItems };
}
