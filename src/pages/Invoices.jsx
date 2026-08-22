import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { FiEye, FiPrinter, FiDownload, FiShare2, FiCreditCard, FiRotateCcw, FiXCircle } from 'react-icons/fi';
import invoicesService from '../services/invoicesService';
import paymentsService from '../services/paymentsService';
import salesReturnsService from '../services/salesReturnsService';
import salesReturnItemsService from '../services/salesReturnItemsService';
import { downloadInvoicePdf, downloadReceiptPdf, shareInvoicePdf, balanceLabel } from '../utils/invoicePdf';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const PAGE_SIZE = 8;

const shareInvoice = async (invoice) => {
  try {
    const result = await shareInvoicePdf(invoice);
    if (result === 'downloaded') toast('Sharing isn\'t available on this device — downloaded the PDF instead.', { icon: '📄' });
  } catch (err) {
    if (err?.name !== 'AbortError') toast.error('Could not share the invoice');
  }
};

export default function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ paymentMethod: 'CASH', transactionReference: '', amount: '' });
  const [returningInvoice, setReturningInvoice] = useState(null);
  const [returnForm, setReturnForm] = useState({ invoiceItemId: '', quantity: '', reason: '' });
  const [cancelling, setCancelling] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null); // { payment, invoice }

  const load = () => {
    setIsLoading(true);
    setLoadError(false);
    invoicesService
      .getAll()
      .then((data) => setInvoices(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  // Deep link from global search (Phase 28) — /invoices?invoiceId=123 opens straight to that
  // invoice's view modal instead of dumping the user on the plain list to re-search by hand.
  useEffect(() => {
    if (!invoices) return;
    const targetId = searchParams.get('invoiceId');
    if (!targetId) return;
    const match = invoices.find((i) => String(i.invoiceId) === targetId);
    if (match) setViewing(match);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices]);

  const filtered = useMemo(() => {
    if (!invoices) return [];
    let rows = invoices;
    if (vehicleFilter !== 'ALL') {
      rows = rows.filter((i) => i.vehicleCategory === vehicleFilter);
    }
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (i) =>
        i.invoiceNumber?.toLowerCase().includes(q) ||
        i.customerName?.toLowerCase().includes(q) ||
        i.customerPhone?.toLowerCase().includes(q) ||
        i.registrationNumber?.toLowerCase().includes(q)
    );
  }, [invoices, search, vehicleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openPay = (invoice) => {
    setPayingInvoice(invoice);
    const due = Number(invoice.balanceAmount ?? 0);
    setPaymentForm({ paymentMethod: 'CASH', transactionReference: '', amount: due > 0 ? due : '' });
  };

  const submitPayment = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) return toast.error('Enter a valid amount');
    setIsSaving(true);
    try {
      const payment = await paymentsService.create({
        invoiceId: payingInvoice.invoiceId,
        paymentMethod: paymentForm.paymentMethod,
        transactionReference: paymentForm.transactionReference || null,
        amount: Number(paymentForm.amount),
      });
      toast.success('Payment recorded');
      setPayingInvoice(null);
      // Pull the invoice fresh — paidAmount/balance/status just changed server-side, and the
      // success prompt's PDF buttons need the up-to-date figures, not the stale pre-payment copy.
      const updatedInvoice = await invoicesService.getById(payingInvoice.invoiceId);
      setPaymentSuccess({ payment, invoice: updatedInvoice });
      load();
    } catch {
      // Global toast already shown.
    } finally {
      setIsSaving(false);
    }
  };

  const openReturn = (invoice) => {
    setReturningInvoice(invoice);
    setReturnForm({ invoiceItemId: '', quantity: '', reason: '' });
  };

  const submitReturn = async () => {
    const item = (returningInvoice.items || []).find((l) => String(l.invoiceItemId) === String(returnForm.invoiceItemId));
    if (!item) return toast.error('Select an item to return');
    if (item.itemType !== 'PRODUCT') return toast.error('Only products can be returned to stock');
    const qty = Number(returnForm.quantity);
    if (!qty || qty <= 0 || qty > Number(item.quantity)) return toast.error(`Enter a quantity up to ${item.quantity}`);

    setIsSaving(true);
    try {
      const ret = await salesReturnsService.create({
        invoiceId: returningInvoice.invoiceId,
        invoiceItemId: item.invoiceItemId,
        customerId: returningInvoice.customerId,
        returnQuantity: qty,
        reason: returnForm.reason || 'Customer return',
        totalAmount: (item.unitPrice * qty).toFixed(2),
        refundStatus: 'PENDING',
      });
      await salesReturnItemsService.create({
        salesReturnId: ret.returnId,
        invoiceId: returningInvoice.invoiceId,
        invoiceItemId: item.invoiceItemId,
        productId: item.productId,
        quantity: qty,
      });
      toast.success('Return recorded and stock restored');
      setReturningInvoice(null);
    } catch {
      // Global toast already shown.
    } finally {
      setIsSaving(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelling) return;
    setIsSaving(true);
    try {
      await invoicesService.cancel(cancelling.invoiceId);
      toast.success('Invoice cancelled and stock restored');
      setCancelling(null);
      load();
    } catch {
      // Global toast already shown.
    } finally {
      setIsSaving(false);
    }
  };

  if (!invoices) return <Loader label="Loading invoices..." />;

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice #', sortable: true },
    {
      key: 'invoiceDate',
      label: 'Date',
      sortable: true,
      render: (row) => dayjs(row.invoiceDate || row.createdAt).format('DD MMM YYYY'),
    },
    { key: 'customerName', label: 'Customer' },
    {
      key: 'vehicleModel',
      label: 'Vehicle',
      render: (row) => (
        <>
          {row.vehicleModel || '—'}
          {row.vehicleCategory && (
            <span className={`badge ms-1 ${row.vehicleCategory === 'BIKE' ? 'bg-info' : 'bg-secondary'}`}>
              {row.vehicleCategory}
            </span>
          )}
        </>
      ),
    },
    { key: 'registrationNumber', label: 'Registration', render: (row) => row.registrationNumber || '—' },
    { key: 'subtotal', label: 'Subtotal', render: (row) => Number(row.subtotal ?? 0).toFixed(2) },
    { key: 'taxAmount', label: 'Tax', render: (row) => Number(row.taxAmount ?? 0).toFixed(2) },
    { key: 'grandTotal', label: 'Grand Total', sortable: true, render: (row) => Number(row.grandTotal ?? 0).toFixed(2) },
    { key: 'paidAmount', label: 'Paid', render: (row) => Number(row.paidAmount ?? 0).toFixed(2) },
    {
      key: 'balanceAmount',
      label: 'Balance',
      render: (row) => {
        const bal = balanceLabel(row.balanceAmount);
        return bal.label === 'Overpayment / Credit' ? (
          <span className="text-info fw-semibold">+{bal.value.toFixed(2)} credit</span>
        ) : (
          bal.value.toFixed(2)
        );
      },
    },
    {
      key: 'paymentStatus',
      label: 'Status',
      render: (row) => (
        <span className={`badge ${row.paymentStatus === 'PAID' ? 'bg-success' : row.paymentStatus === 'PARTIAL' ? 'bg-warning text-dark' : 'bg-danger'}`}>
          {row.paymentStatus}
        </span>
      ),
    },
    {
      key: 'status',
      label: '',
      render: (row) => (row.status === 'CANCELLED' ? <span className="badge bg-secondary">Cancelled</span> : null),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="d-flex gap-1">
          <button className="btn btn-sm btn-outline-secondary" title="View Invoice" onClick={() => setViewing(row)}>
            <FiEye size={13} />
          </button>
          <button className="btn btn-sm btn-outline-secondary" title="Download PDF" onClick={() => downloadInvoicePdf(row)}>
            <FiDownload size={13} />
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            title="Print"
            onClick={() => {
              setViewing(row);
              setTimeout(() => window.print(), 250);
            }}
          >
            <FiPrinter size={13} />
          </button>
          <button className="btn btn-sm btn-outline-secondary" title="Share" onClick={() => shareInvoice(row)}>
            <FiShare2 size={13} />
          </button>
          {row.status !== 'CANCELLED' && (
            <>
              <button className="btn btn-sm btn-outline-success" title="Record Payment" onClick={() => openPay(row)}>
                <FiCreditCard size={13} />
              </button>
              <button className="btn btn-sm btn-outline-warning" title="Return" onClick={() => openReturn(row)}>
                <FiRotateCcw size={13} />
              </button>
              <button className="btn btn-sm btn-outline-danger" title="Cancel Invoice" onClick={() => setCancelling(row)}>
                <FiXCircle size={13} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (loadError) return <ErrorPage message="Could not load invoices. Check your connection and try again." onRetry={load} />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Invoices</h1>
        <div className="btn-group" role="group" aria-label="Filter by vehicle type">
          {['ALL', 'CAR', 'BIKE'].map((v) => (
            <button
              key={v}
              type="button"
              className={`btn btn-sm ${vehicleFilter === v ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => {
                setVehicleFilter(v);
                setPage(1);
              }}
            >
              {v === 'ALL' ? 'All' : v === 'CAR' ? 'Car' : 'Bike'}
            </button>
          ))}
        </div>
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by invoice #, customer, mobile, registration..."
        />
      </div>

      <DataTable
        columns={columns}
        rows={pagedRows}
        isLoading={isLoading}
        keyField="invoiceId"
        emptyTitle="No invoices yet"
        emptyMessage="Complete a bill in Point of Sale to create your first invoice."
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />

      {/* View invoice */}
      <Modal show={Boolean(viewing)} title={viewing ? `Invoice ${viewing.invoiceNumber}` : ''} size="modal-lg" onClose={() => setViewing(null)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setViewing(null)}>Close</button>
            <button className="btn btn-outline-primary d-flex align-items-center gap-1" onClick={() => shareInvoice(viewing)}>
              <FiShare2 /> Share
            </button>
            <button className="btn btn-outline-primary d-flex align-items-center gap-1" onClick={() => downloadInvoicePdf(viewing)}>
              <FiDownload /> Download PDF
            </button>
            <button className="btn btn-primary d-flex align-items-center gap-1" onClick={() => window.print()}>
              <FiPrinter /> Print
            </button>
          </>
        }
      >
        {viewing && (
          <div id="invoice-view-print">
            <div className="row g-2 mb-3 small">
              <div className="col-md-6"><strong>Customer:</strong> {viewing.customerName}</div>
              <div className="col-md-6"><strong>Mobile:</strong> {viewing.customerPhone || '-'}</div>
              <div className="col-md-6"><strong>Vehicle:</strong> {viewing.vehicleModel || '-'}</div>
              <div className="col-md-6"><strong>Registration:</strong> {viewing.registrationNumber || '-'}</div>
              <div className="col-md-6"><strong>Odometer:</strong> {viewing.odometer ? `${viewing.odometer} km` : '-'}</div>
              <div className="col-md-6"><strong>Payment:</strong> {viewing.paymentMethod}</div>
            </div>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead><tr><th>Type</th><th>Item</th><th>Qty</th><th>Rate</th><th>GST</th><th>Amount</th></tr></thead>
                <tbody>
                  {(viewing.items || []).map((l) => (
                    <tr key={l.invoiceItemId}>
                      <td><span className={`badge ${l.itemType === 'SERVICE' ? 'erp-badge-service' : 'erp-badge-product'}`}>{l.itemType === 'SERVICE' ? 'Service' : 'Product'}</span></td>
                      <td>{l.description || l.itemName}</td>
                      <td>{l.quantity}</td>
                      <td>{Number(l.unitPrice).toFixed(2)}</td>
                      <td>{Number(l.taxPercentage ?? 0)}%</td>
                      <td>{Number(l.totalAmount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex justify-content-between"><span>Service Subtotal</span><span>{Number(viewing.serviceSubtotal ?? 0).toFixed(2)}</span></div>
            <div className="d-flex justify-content-between"><span>Product Subtotal</span><span>{Number(viewing.productSubtotal ?? 0).toFixed(2)}</span></div>
            <div className="d-flex justify-content-between"><span>Discount</span><span>{Number(viewing.discountAmount ?? 0).toFixed(2)}</span></div>
            <div className="d-flex justify-content-between"><span>CGST</span><span>{Number(viewing.cgstAmount ?? 0).toFixed(2)}</span></div>
            <div className="d-flex justify-content-between"><span>SGST</span><span>{Number(viewing.sgstAmount ?? 0).toFixed(2)}</span></div>
            <div className="d-flex justify-content-between"><strong>Grand Total</strong><strong>{Number(viewing.grandTotal ?? 0).toFixed(2)}</strong></div>
            <div className="d-flex justify-content-between"><span>Paid</span><strong>{Number(viewing.paidAmount ?? 0).toFixed(2)}</strong></div>
            <div className="d-flex justify-content-between">
              <span>{balanceLabel(viewing.balanceAmount).label}</span>
              <strong className={balanceLabel(viewing.balanceAmount).label === 'Overpayment / Credit' ? 'text-info' : ''}>
                {balanceLabel(viewing.balanceAmount).value.toFixed(2)}
              </strong>
            </div>
          </div>
        )}
      </Modal>

      {/* Record payment */}
      <Modal show={Boolean(payingInvoice)} title="Record Payment" onClose={() => setPayingInvoice(null)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPayingInvoice(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitPayment} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Payment'}</button>
          </>
        }
      >
        {payingInvoice && (
          <div>
            <p className="text-muted small">
              {balanceLabel(payingInvoice.balanceAmount).label}:{' '}
              <strong>{balanceLabel(payingInvoice.balanceAmount).value.toFixed(2)}</strong>
            </p>
            <div className="mb-3">
              <label className="form-label">Payment Method</label>
              <select className="form-select" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Transaction Reference</label>
              <input className="form-control" value={paymentForm.transactionReference} onChange={(e) => setPaymentForm((f) => ({ ...f, transactionReference: e.target.value }))} />
            </div>
            <div className="mb-3">
              <label className="form-label">Amount</label>
              <input type="number" min="0" step="0.01" className="form-control" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
        )}
      </Modal>

      {/* Return */}
      <Modal show={Boolean(returningInvoice)} title="Return Item" onClose={() => setReturningInvoice(null)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setReturningInvoice(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitReturn} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Return'}</button>
          </>
        }
      >
        {returningInvoice && (
          <div>
            <div className="mb-3">
              <label className="form-label">Item</label>
              <select className="form-select" value={returnForm.invoiceItemId} onChange={(e) => setReturnForm((f) => ({ ...f, invoiceItemId: e.target.value }))}>
                <option value="">Select a product line...</option>
                {(returningInvoice.items || [])
                  .filter((l) => l.itemType === 'PRODUCT')
                  .map((l) => (
                    <option key={l.invoiceItemId} value={l.invoiceItemId}>
                      {l.description || l.itemName} (qty {l.quantity})
                    </option>
                  ))}
              </select>
              <div className="form-text">Only products can be returned to stock — services aren&apos;t stock-tracked.</div>
            </div>
            <div className="mb-3">
              <label className="form-label">Return Quantity</label>
              <input type="number" min="1" className="form-control" value={returnForm.quantity} onChange={(e) => setReturnForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="mb-3">
              <label className="form-label">Reason</label>
              <input className="form-control" value={returnForm.reason} onChange={(e) => setReturnForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        show={Boolean(cancelling)}
        title="Cancel this invoice?"
        message="This restocks any product lines and marks the invoice as cancelled. This action cannot be undone."
        isLoading={isSaving}
        onConfirm={confirmCancel}
        onCancel={() => setCancelling(null)}
      />

      {/* Payment successful — offer both PDFs immediately, per the expected flow. */}
      <Modal
        show={Boolean(paymentSuccess)}
        title="Payment Successful"
        onClose={() => setPaymentSuccess(null)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPaymentSuccess(null)}>Close</button>
            <button
              className="btn btn-outline-primary d-flex align-items-center gap-1"
              onClick={() => downloadReceiptPdf(paymentSuccess.payment, paymentSuccess.invoice)}
            >
              <FiDownload /> Payment Receipt PDF
            </button>
            <button
              className="btn btn-primary d-flex align-items-center gap-1"
              onClick={() => downloadInvoicePdf(paymentSuccess.invoice)}
            >
              <FiDownload /> Invoice PDF
            </button>
          </>
        }
      >
        {paymentSuccess && (
          <div className="text-center py-2">
            <div className="text-success mb-2" style={{ fontSize: '2rem' }}>✓</div>
            <p className="mb-1">
              <strong>{Number(paymentSuccess.payment.amount).toFixed(2)}</strong> received for invoice{' '}
              <strong>{paymentSuccess.invoice.invoiceNumber}</strong>.
            </p>
            <p className="text-secondary small mb-0">
              {balanceLabel(paymentSuccess.invoice.balanceAmount).label}:{' '}
              {balanceLabel(paymentSuccess.invoice.balanceAmount).value.toFixed(2)} · Status:{' '}
              {paymentSuccess.invoice.paymentStatus}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
