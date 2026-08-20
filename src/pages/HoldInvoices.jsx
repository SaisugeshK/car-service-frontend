import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { FiPlay, FiTrash2 } from 'react-icons/fi';
import holdInvoicesService from '../services/holdInvoicesService';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import Loader from '../components/Loader';

// Bills parked mid-billing (customer leaves the vehicle, comes back later) — a held bill never
// touches stock, payment, or invoice numbering until it's resumed and actually completed in POS.
export default function HoldInvoices() {
  const navigate = useNavigate();
  const [holds, setHolds] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setIsLoading(true);
    holdInvoicesService
      .getAll()
      .then((data) => setHolds(Array.isArray(data) ? data : data?.content || []))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const itemCount = (row) => {
    try {
      return (JSON.parse(row.data).cart || []).length;
    } catch {
      return '—';
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await holdInvoicesService.remove(deleting.holdId);
    toast.success('Held bill discarded');
    setDeleting(null);
    load();
  };

  if (!holds) return <Loader label="Loading held bills..." />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Held Bills</h1>
        <button className="btn btn-primary" onClick={() => navigate('/pos')}>
          New Bill
        </button>
      </div>

      <DataTable
        isLoading={isLoading}
        rows={holds}
        keyField="holdId"
        emptyTitle="No bills on hold"
        emptyMessage='Use "Hold Bill" in Point of Sale to park a bill for later.'
        columns={[
          { key: 'holdId', label: 'ID', sortable: true },
          { key: 'customerName', label: 'Customer', render: (row) => row.customerName || '—' },
          { key: 'vehicleModel', label: 'Vehicle', render: (row) => row.vehicleModel || '—' },
          { key: 'registrationNumber', label: 'Registration', render: (row) => row.registrationNumber || '—' },
          { key: 'items', label: 'Items', render: itemCount },
          {
            key: 'createdAt',
            label: 'Held At',
            sortable: true,
            render: (row) => dayjs(row.createdAt).format('DD MMM YYYY, HH:mm'),
          },
          { key: 'status', label: 'Status', render: (row) => <span className="badge bg-warning text-dark">{row.status}</span> },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="d-flex gap-1">
                <button
                  className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                  onClick={() => navigate('/pos', { state: { resumeHoldId: row.holdId } })}
                >
                  <FiPlay size={13} /> Resume
                </button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleting(row)}>
                  <FiTrash2 size={13} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <ConfirmDialog
        show={Boolean(deleting)}
        title="Discard this held bill?"
        message="This permanently removes the parked cart. This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
