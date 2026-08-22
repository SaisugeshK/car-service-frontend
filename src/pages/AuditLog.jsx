import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { FiUser, FiFileText, FiTool, FiCreditCard, FiClipboard } from 'react-icons/fi';
import auditLogsService from '../services/auditLogsService';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

const ENTITY_ICON = {
  ESTIMATE: FiFileText,
  ADDITIONAL_WORK: FiTool,
  INVOICE: FiFileText,
  PAYMENT: FiCreditCard,
  JOB_CARD: FiClipboard,
};

const ACTION_TONE = {
  ESTIMATE_CREATED: 'bg-info text-dark',
  ESTIMATE_REVISED: 'bg-info text-dark',
  ESTIMATE_APPROVED: 'bg-success',
  ESTIMATE_REJECTED: 'bg-danger',
  ADDITIONAL_WORK_REQUESTED: 'bg-warning text-dark',
  ADDITIONAL_WORK_APPROVED: 'bg-success',
  ADDITIONAL_WORK_REJECTED: 'bg-danger',
  INVOICE_GENERATED: 'bg-primary',
  PAYMENT_RECEIVED: 'bg-success',
  JOB_STATUS_CHANGED: 'bg-secondary',
  DELIVERY_COMPLETED: 'bg-success',
};

const ACTION_LABEL = Object.fromEntries(
  Object.keys(ACTION_TONE).map((k) => [k, k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())])
);

const ENTITY_SEGMENTS = ['ALL', 'ESTIMATE', 'ADDITIONAL_WORK', 'INVOICE', 'PAYMENT', 'JOB_CARD'];

// Phase 30 — permanent compliance trail: who did what to which record, when. Distinct from
// Notification Center (Phase 29, dismissible staff inbox) — nothing here is ever marked read,
// nothing is ever deleted. SUPER_ADMIN only, same as Users/Roles/Settings.
export default function AuditLog() {
  const [logs, setLogs] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [entityFilter, setEntityFilter] = useState('ALL');

  const load = () => {
    setLoadError(false);
    auditLogsService
      .getAll()
      .then((data) => setLogs(asList(data)))
      .catch(() => setLoadError(true));
  };

  useEffect(load, []);

  if (loadError) return <ErrorPage message="Could not load the audit log. Check your connection and try again." onRetry={load} />;
  if (!logs) return <Loader label="Loading audit log..." />;

  const filtered = entityFilter === 'ALL' ? logs : logs.filter((l) => l.entityType === entityFilter);

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Audit Log</h1>
        <div className="btn-group" role="group" aria-label="Filter by record type">
          {ENTITY_SEGMENTS.map((s) => (
            <button
              key={s}
              type="button"
              className={`btn btn-sm ${entityFilter === s ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setEntityFilter(s)}
            >
              {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        rows={filtered}
        keyField="auditLogId"
        emptyTitle="No audit entries yet"
        emptyMessage="Business actions (estimates, invoices, payments, job status changes) will appear here as they happen."
        columns={[
          {
            key: 'username',
            label: 'User',
            render: (row) => (
              <span className="d-flex align-items-center gap-1">
                <FiUser size={13} className="text-secondary" /> {row.username || 'System'}
              </span>
            ),
          },
          {
            key: 'action',
            label: 'Action',
            sortable: true,
            render: (row) => <span className={`badge ${ACTION_TONE[row.action] || 'bg-secondary'}`}>{ACTION_LABEL[row.action] || row.action}</span>,
          },
          {
            key: 'entityType',
            label: 'Record',
            render: (row) => {
              const Icon = ENTITY_ICON[row.entityType] || FiFileText;
              return (
                <span className="d-flex align-items-center gap-1 small">
                  <Icon size={13} className="text-secondary" />
                  {row.entityType?.replace(/_/g, ' ')} {row.entityId ? `#${row.entityId}` : ''}
                </span>
              );
            },
          },
          { key: 'description', label: 'Details', render: (row) => <span className="small text-secondary">{row.description}</span> },
          {
            key: 'createdAt',
            label: 'Date / Time',
            sortable: true,
            render: (row) => dayjs(row.createdAt).format('DD MMM YYYY, hh:mm A'),
          },
        ]}
      />
    </div>
  );
}
