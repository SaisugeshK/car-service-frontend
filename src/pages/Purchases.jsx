import { useAuth } from '../context/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import purchasesService from '../services/purchasesService';
import suppliersService from '../services/suppliersService';
import productsService from '../services/productsService';
import useCrud from '../hooks/useCrud';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const emptyLine = () => ({ productId: '', quantity: 1, purchasePrice: 0, taxAmount: 0 });

export default function Purchases() {
  // Read-only for an EMPLOYEE — the API refuses their writes anyway; this hides the buttons.
  const { isSuperAdmin } = useAuth();
  const { items, isLoading, isSaving, create, remove } = useCrud(purchasesService, {
    entityName: 'Purchase',
  });

  const [suppliers, setSuppliers] = useState(null);
  const [products, setProducts] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingRow, setDeletingRow] = useState(null);

  const [supplierId, setSupplierId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [lines, setLines] = useState([emptyLine()]);
  const [loadError, setLoadError] = useState(false);

  const loadRefs = () => {
    setLoadError(false);
    Promise.all([suppliersService.getAll(), productsService.getAll({ itemType: 'PRODUCT' })])
      .then(([s, p]) => {
        setSuppliers(Array.isArray(s) ? s : s?.content || []);
        setProducts(Array.isArray(p) ? p : p?.content || []);
      })
      .catch(() => setLoadError(true));
  };

  useEffect(loadRefs, []);

  const totals = useMemo(() => {
    const totalAmount = lines.reduce(
      (sum, l) => sum + Number(l.quantity || 0) * Number(l.purchasePrice || 0),
      0
    );
    const tax = lines.reduce((sum, l) => sum + Number(l.taxAmount || 0), 0);
    return { totalAmount, tax, grandTotal: totalAmount + tax };
  }, [lines]);

  const openCreate = () => {
    setSupplierId('');
    setPaymentStatus('PAID');
    setLines([emptyLine()]);
    setShowForm(true);
  };

  const updateLine = (idx, patch) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const onProductChange = (idx, productId) => {
    const product = products.find((p) => String(p.id) === String(productId));
    updateLine(idx, {
      productId,
      purchasePrice: product?.purchasePrice ?? 0,
    });
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!supplierId) return toast.error('Please select a supplier');
    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);
    if (validLines.length === 0) return toast.error('Add at least one product line');

    const payload = {
      supplierId: Number(supplierId),
      // No invoiceNumber sent — the backend auto-generates a unique one for each purchase.
      totalAmount: Number(totals.totalAmount.toFixed(2)),
      tax: Number(totals.tax.toFixed(2)),
      paymentStatus,
      items: validLines.map((l) => ({
        productId: Number(l.productId),
        quantity: Number(l.quantity),
        purchasePrice: Number(l.purchasePrice),
        taxAmount: Number(l.taxAmount || 0),
      })),
    };

    await create(payload);
    setShowForm(false);
  };

  const confirmDelete = async () => {
    if (!deletingRow) return;
    await remove(deletingRow.id);
    setDeletingRow(null);
  };

  if (loadError) return <ErrorPage message="Could not load purchase data. Check your connection and try again." onRetry={loadRefs} />;
  if (!suppliers || !products) return <Loader label="Loading purchase data..." />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Purchases</h1>
        {isSuperAdmin && (
          <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openCreate}>
            <FiPlus /> New Purchase
          </button>
        )}
      </div>

      <DataTable
        isLoading={isLoading}
        rows={items}
        onDelete={isSuperAdmin ? setDeletingRow : undefined}
        emptyTitle="No purchases yet"
        emptyMessage='Click "New Purchase" to record stock coming in from a supplier.'
        columns={[
          { key: 'id', label: 'ID', sortable: true },
          { key: 'invoiceNumber', label: 'Invoice #', sortable: true },
          {
            key: 'supplierId',
            label: 'Supplier',
            render: (row) => suppliers.find((s) => s.id === row.supplierId)?.supplierName || row.supplierId,
          },
          { key: 'totalAmount', label: 'Total', sortable: true },
          { key: 'tax', label: 'Tax' },
          {
            key: 'paymentStatus',
            label: 'Status',
            render: (row) => (
              <span className={`badge ${row.paymentStatus === 'PAID' ? 'bg-success' : 'bg-warning text-dark'}`}>
                {row.paymentStatus}
              </span>
            ),
          },
        ]}
      />

      <Modal
        show={showForm}
        title="New Purchase"
        size="modal-lg"
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Purchase'}
            </button>
          </>
        }
      >
        <div className="row g-3 mb-3">
          <div className="col-md-8">
            <label className="form-label">Supplier</label>
            <select
              className="form-select"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.supplierName}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Payment Status</label>
            <select
              className="form-select"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>
          <div className="col-12">
            <div className="form-text">
              An invoice number is generated automatically once you save this purchase.
            </div>
          </div>
        </div>

        <div className="table-responsive mb-2">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>Product</th>
                <th style={{ width: 90 }}>Qty</th>
                <th style={{ width: 130 }}>Purchase Price</th>
                <th style={{ width: 120 }}>Tax Amount</th>
                <th style={{ width: 110 }}>Line Total</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const lineTotal =
                  Number(line.quantity || 0) * Number(line.purchasePrice || 0) +
                  Number(line.taxAmount || 0);
                return (
                  <tr key={idx}>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={line.productId}
                        onChange={(e) => onProductChange(idx, e.target.value)}
                      >
                        <option value="">Select product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.productName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-control form-control-sm"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        value={line.purchasePrice}
                        onChange={(e) => updateLine(idx, { purchasePrice: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        value={line.taxAmount}
                        onChange={(e) => updateLine(idx, { taxAmount: e.target.value })}
                      />
                    </td>
                    <td>{lineTotal.toFixed(2)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length === 1}
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button className="btn btn-sm btn-outline-primary mb-3" onClick={addLine}>
          <FiPlus size={14} /> Add Line
        </button>

        <div className="d-flex justify-content-end">
          <div style={{ minWidth: 220 }}>
            <div className="d-flex justify-content-between">
              <span>Subtotal</span>
              <strong>{totals.totalAmount.toFixed(2)}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>Tax</span>
              <strong>{totals.tax.toFixed(2)}</strong>
            </div>
            <hr className="my-1" />
            <div className="d-flex justify-content-between">
              <span>Grand Total</span>
              <strong>{totals.grandTotal.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        show={Boolean(deletingRow)}
        title="Delete purchase?"
        message="This will permanently delete this purchase record. This action cannot be undone."
        isLoading={isSaving}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingRow(null)}
      />
    </div>
  );
}
