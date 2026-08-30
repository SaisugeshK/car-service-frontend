import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FiPlus } from 'react-icons/fi';
import useCrud from '../hooks/useCrud';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import ErrorPage from './ErrorPage';

const PAGE_SIZE = 8;

/**
 * Renders a full list + create/edit modal + delete confirmation for a module,
 * driven entirely by a config object. This is what powers every "simple"
 * CRUD module (Roles, Units, Settings, Billing Counters, ...) so the same
 * list/search/paginate/validate/toast logic isn't rewritten 15 times.
 *
 * config = {
 *   title, entityName, service, keyField='id',
 *   columns: [{ key, label, sortable, render }],
 *   fields: [{ name, label, type: 'text'|'number'|'select'|'textarea'|'note', required, options,
 *              valueKey, labelKey, fullWidth, showIf: (watchedValues) => bool }],
 *              showIf lets a field hide/show based on another field's current value (e.g. an
 *              Item Type toggle switching between a Service picker and a Product picker).
 *   schema: yup schema,
 *   searchKeys: [field names to filter on],
 *   defaultValues: {},
 *   segments: [{ value, label, predicate: (row) => bool }] // optional segmented filter
 *              rendered as a button group above the table; first entry is selected by default.
 * }
 */
export default function CrudPage({ config }) {
  const {
    title,
    entityName,
    service,
    keyField = 'id',
    columns,
    fields,
    schema,
    searchKeys = [],
    defaultValues = {},
    segments,
    hideAddButton = false,
    headerExtra,
    onRowClick,
  } = config;

  const { items, isLoading, isSaving, error, load, create, update, remove } = useCrud(service, {
    entityName,
  });

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [segment, setSegment] = useState(segments?.[0]?.value);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: schema ? yupResolver(schema) : undefined,
    defaultValues,
  });

  const watchedValues = watch();
  const visibleFields = fields.filter((f) => !f.showIf || f.showIf(watchedValues));

  const bySegment = useMemo(() => {
    if (!segments || segments.length === 0) return items;
    const active = segments.find((s) => s.value === segment);
    return active?.predicate ? items.filter(active.predicate) : items;
  }, [items, segments, segment]);

  const filtered = useMemo(() => {
    if (!search || searchKeys.length === 0) return bySegment;
    const q = search.toLowerCase();
    return bySegment.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
    );
  }, [bySegment, search, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setEditingRow(null);
    reset(defaultValues);
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    reset({ ...defaultValues, ...(config.transformRow ? config.transformRow(row) : row) });
    setShowForm(true);
  };

  const getRecordId = (row) => {
    const candidateKeys = [
      keyField,
      'id',
      `${entityName?.toLowerCase()}Id`,
      `${entityName?.replace(/\s+/g, '').toLowerCase()}Id`,
      'productId',
      '_id',
    ];

    for (const key of candidateKeys) {
      if (key && row?.[key] !== undefined) {
        return row[key];
      }
    }

    return undefined;
  };

  const onSubmit = async (values) => {
    // Coerce number-typed fields since HTML inputs always deliver strings.
    const payload = { ...values };
    fields.forEach((f) => {
      if (f.type === 'number' && payload[f.name] !== '' && payload[f.name] != null) {
        payload[f.name] = Number(payload[f.name]);
      }
    });

    // Lets a page reshape the form values into the API body (e.g. fold a priceGrid object
    // into a list). Returns the object actually sent.
    const body = config.transformPayload ? config.transformPayload(payload, { editingRow }) : payload;

    let saved;
    if (editingRow) {
      const recordId = getRecordId(editingRow);
      if (recordId == null) {
        throw new Error('Unable to determine record ID for update');
      }
      saved = await update(recordId, body);
    } else {
      saved = await create(body);
    }
    if (config.onAfterSave) await config.onAfterSave(saved, body);
    setShowForm(false);
  };

  const confirmDelete = async () => {
    if (!deletingRow) return;
    const recordId = getRecordId(deletingRow);
    if (recordId == null) return;
    await remove(recordId);
    setDeletingRow(null);
  };

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">{title}</h1>
        <div className="d-flex align-items-center gap-2">
          {segments && segments.length > 0 && (
            <div className="btn-group" role="group" aria-label="Filter">
              {segments.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`btn btn-sm ${segment === s.value ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => {
                    setSegment(s.value);
                    setPage(1);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {searchKeys.length > 0 && (
            <SearchBar
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder={`Search ${title.toLowerCase()}...`}
            />
          )}
          {headerExtra}
          {!hideAddButton && (
            <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openCreate}>
              <FiPlus /> Add {entityName}
            </button>
          )}
        </div>
      </div>

      {error && !isLoading ? (
        // A failed fetch (network/backend/timeout) must never look like "no records" — that's
        // an honest empty state, this isn't. items stays [] either way, so without this check
        // DataTable would silently render "click Add to create your first record" on a 500.
        <ErrorPage message={`Could not load ${title.toLowerCase()}. Check your connection and try again.`} onRetry={load} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={pagedRows}
            onRowClick={onRowClick}
            isLoading={isLoading}
            onEdit={openEdit}
            onDelete={setDeletingRow}
            keyField={keyField}
            emptyTitle={`No ${title.toLowerCase()} yet`}
            emptyMessage={`Click "Add ${entityName}" to create your first record.`}
          />

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
          />
        </>
      )}

      <Modal
        show={showForm}
        title={editingRow ? `Edit ${entityName}` : `Add ${entityName}`}
        size="modal-lg"
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit(onSubmit)} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="row g-3">
            {visibleFields.map((f) => (
              <div key={f.name} className={f.fullWidth || f.type === 'note' ? 'col-12' : 'col-md-6'}>
                {f.type === 'note' ? (
                  <div className="form-text mt-0 mb-3">{f.text}</div>
                ) : f.type === 'priceGrid' ? (
                  <div>
                    <label className="form-label">{f.label}{f.required && ' *'}</label>
                    <div className="d-flex flex-wrap gap-2">
                      {(typeof f.options === 'function' ? f.options(watchedValues) : (f.options || [])).map((o) => (
                        <div key={o.value} style={{ width: 130 }}>
                          <label className="form-text mb-0 d-block" htmlFor={`${f.name}-${o.value}`}>{o.label}</label>
                          <input
                            id={`${f.name}-${o.value}`}
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-control form-control-sm"
                            {...register(`${f.name}.${o.value}`)}
                          />
                        </div>
                      ))}
                    </div>
                    {f.help && <div className="form-text mt-1">{f.help}</div>}
                  </div>
                ) : f.type === 'select' ? (
                  <FormSelect
                    label={f.label}
                    name={f.name}
                    register={register}
                    error={errors[f.name]}
                    options={typeof f.options === 'function' ? f.options(watchedValues) : (f.options || [])}
                    required={f.required}
                    valueKey={f.valueKey || 'value'}
                    labelKey={f.labelKey || 'label'}
                  />
                ) : (
                  <FormInput
                    label={f.label}
                    name={f.name}
                    type={f.type || 'text'}
                    step={f.step}
                    min={f.min}
                    register={register}
                    error={errors[f.name]}
                    required={f.required}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        show={Boolean(deletingRow)}
        title={`Delete ${entityName}?`}
        message={`This will permanently delete this ${entityName.toLowerCase()}. This action cannot be undone.`}
        isLoading={isSaving}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingRow(null)}
      />
    </div>
  );
}

// Re-export so pages can trigger a manual refresh if ever needed elsewhere.
export { PAGE_SIZE };
