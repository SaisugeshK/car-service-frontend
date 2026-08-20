import { useMemo, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiEdit2, FiTrash2 } from 'react-icons/fi';
import SkeletonTable from './Skeleton';
import EmptyState from './EmptyState';

/**
 * Generic data table used by every module page.
 *
 * columns: [{ key, label, sortable, render(row) }]
 * rows: array of records
 * onEdit / onDelete: optional row action handlers
 */
export default function DataTable({
  columns,
  rows = [],
  isLoading = false,
  onEdit,
  onDelete,
  onRowClick,
  keyField = 'id',
  emptyTitle = 'No records found',
  emptyMessage = 'Try adjusting your filters or add a new record.',
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (col) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  const showActions = Boolean(onEdit || onDelete);

  return (
    <div className="table-responsive erp-card">
      <table className="table table-hover align-middle mb-0">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                role={col.sortable ? 'button' : undefined}
                onClick={() => toggleSort(col)}
                style={{ whiteSpace: 'nowrap', userSelect: 'none' }}
              >
                {col.label}
                {col.sortable && sortKey === col.key && (
                  <span className="ms-1">
                    {sortDir === 'asc' ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                  </span>
                )}
              </th>
            ))}
            {showActions && <th style={{ width: 110 }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {isLoading && <SkeletonTable rows={6} columns={columns.length + (showActions ? 1 : 0)} />}

          {!isLoading && sortedRows.length === 0 && (
            <tr>
              <td colSpan={columns.length + (showActions ? 1 : 0)} className="p-0 border-0">
                <EmptyState title={emptyTitle} message={emptyMessage} />
              </td>
            </tr>
          )}

          {!isLoading &&
            sortedRows.map((row) => (
              <tr
                key={row[keyField] ?? JSON.stringify(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
                {showActions && (
                  <td>
                    <div className="d-flex gap-2">
                      {onEdit && (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={(e) => { e.stopPropagation(); onEdit(row); }}
                          title="Edit"
                        >
                          <FiEdit2 size={14} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={(e) => { e.stopPropagation(); onDelete(row); }}
                          title="Delete"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
