import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { FiEye, FiDownload, FiFileText, FiPrinter } from 'react-icons/fi';
import CrudPage from './CrudPage';
import paymentsService from '../services/paymentsService';
import invoicesService from '../services/invoicesService';
import usersService from '../services/usersService';
import { paymentSchema } from '../utils/validationSchemas';
import { downloadInvoicePdf, downloadReceiptPdf, balanceLabel } from '../utils/invoicePdf';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

export default function Payments() {
  const [invoices, setInvoices] = useState(null);
  const [users, setUsers] = useState([]);
  const [viewing, setViewing] = useState(null); // { payment, invoice }
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoadError(false);
    invoicesService
      .getAll()
      .then((data) => setInvoices(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setLoadError(true));
    // GET /api/users is SUPER_ADMIN-only on the backend — a MANAGER session gets a 403 here.
    // Non-critical for this page (only used to show a "Received By" display name), so fail
    // quietly rather than leave an unhandled rejection in the console.
    usersService.getAll(undefined, { skipErrorToast: true }).then((data) => {
      setUsers(Array.isArray(data) ? data : data?.content || []);
    }).catch(() => setUsers([]));
  };

  useEffect(load, []);

  if (loadError) return <ErrorPage message="Could not load invoices. Check your connection and try again." onRetry={load} />;
  if (!invoices) return <Loader label="Loading invoices..." />;

  const invoiceFor = (row) => invoices.find((i) => i.id === row.invoiceId);

  const config = {
    title: 'Payments',
    entityName: 'Payment',
    service: paymentsService,
    searchKeys: ['paymentMethod', 'transactionReference'],
    defaultValues: { invoiceId: '', paymentMethod: 'CASH', transactionReference: '', amount: '', receivedByUserId: '', notes: '' },
    schema: paymentSchema,
    columns: [
      { key: 'transactionId', label: 'ID', sortable: true },
      {
        key: 'invoiceId',
        label: 'Invoice',
        render: (row) => row.invoiceNumber || invoiceFor(row)?.invoiceNumber || row.invoiceId,
      },
      { key: 'customerName', label: 'Customer', render: (row) => row.customerName || invoiceFor(row)?.customerName || '—' },
      {
        key: 'paymentDate',
        label: 'Date',
        render: (row) => (row.paymentDate ? dayjs(row.paymentDate).format('DD MMM YYYY, HH:mm') : '—'),
      },
      { key: 'paymentMethod', label: 'Method' },
      { key: 'transactionReference', label: 'Reference', render: (row) => row.transactionReference || '—' },
      { key: 'amount', label: 'Amount', sortable: true, render: (row) => Number(row.amount ?? 0).toFixed(2) },
      {
        key: 'invoiceTotal',
        label: 'Invoice Total',
        render: (row) => Number(invoiceFor(row)?.grandTotal ?? 0).toFixed(2),
      },
      {
        key: 'balance',
        label: 'Balance',
        render: (row) => {
          const inv = invoiceFor(row);
          if (!inv) return '—';
          const { label, value } = balanceLabel(inv.balanceAmount);
          return <span className={label === 'Overpayment / Credit' ? 'text-info' : ''}>{value.toFixed(2)}</span>;
        },
      },
      { key: 'receivedByName', label: 'Received By', render: (row) => row.receivedByName || '—' },
      {
        key: 'documents',
        label: 'Documents',
        render: (row) => {
          const invoice = invoiceFor(row);
          return (
            <div className="d-flex gap-1">
              <button
                className="btn btn-sm btn-outline-secondary"
                title="View Payment"
                onClick={() => setViewing({ payment: row, invoice })}
              >
                <FiEye size={13} />
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                title="Download Payment Receipt PDF"
                onClick={() => downloadReceiptPdf(row, invoice)}
              >
                <FiDownload size={13} />
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                title="View/Download Invoice PDF"
                onClick={() => (invoice ? downloadInvoicePdf(invoice) : null)}
                disabled={!invoice}
              >
                <FiFileText size={13} />
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                title="Print Receipt"
                onClick={() => {
                  setViewing({ payment: row, invoice });
                  setTimeout(() => window.print(), 250);
                }}
              >
                <FiPrinter size={13} />
              </button>
            </div>
          );
        },
      },
    ],
    fields: [
      {
        name: 'invoiceId',
        label: 'Invoice',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'invoiceNumber',
        options: invoices,
      },
      {
        name: 'paymentMethod',
        label: 'Payment Method',
        type: 'select',
        required: true,
        options: [
          { value: 'CASH', label: 'Cash' },
          { value: 'CARD', label: 'Card' },
          { value: 'UPI', label: 'UPI' },
          { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
          { value: 'OTHER', label: 'Other' },
        ],
      },
      { name: 'transactionReference', label: 'Transaction Reference' },
      { name: 'amount', label: 'Amount', type: 'number', step: '0.01', min: '0.01', required: true },
      {
        name: 'receivedByUserId',
        label: 'Received By',
        type: 'select',
        valueKey: 'id',
        labelKey: 'fullName',
        options: users.map((u) => ({ id: u.id, fullName: u.fullName || u.username })),
      },
      { name: 'notes', label: 'Notes', type: 'textarea', fullWidth: true },
    ],
  };

  return (
    <>
      <CrudPage config={config} />

      <Modal
        show={Boolean(viewing)}
        title={viewing ? `Payment RCPT-${viewing.payment.transactionId}` : ''}
        onClose={() => setViewing(null)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setViewing(null)}>Close</button>
            {viewing?.invoice && (
              <button className="btn btn-outline-primary d-flex align-items-center gap-1" onClick={() => downloadInvoicePdf(viewing.invoice)}>
                <FiFileText /> Invoice PDF
              </button>
            )}
            <button className="btn btn-outline-primary d-flex align-items-center gap-1" onClick={() => downloadReceiptPdf(viewing.payment, viewing.invoice)}>
              <FiDownload /> Receipt PDF
            </button>
            <button className="btn btn-primary d-flex align-items-center gap-1" onClick={() => window.print()}>
              <FiPrinter /> Print
            </button>
          </>
        }
      >
        {viewing && (
          <div id="payment-view-print">
            <div className="row g-2 mb-3 small">
              <div className="col-md-6"><strong>Invoice:</strong> {viewing.invoice?.invoiceNumber || '—'}</div>
              <div className="col-md-6"><strong>Date:</strong> {dayjs(viewing.payment.paymentDate).format('DD MMM YYYY, HH:mm')}</div>
              <div className="col-md-6"><strong>Customer:</strong> {viewing.invoice?.customerName || '—'}</div>
              <div className="col-md-6"><strong>Mobile:</strong> {viewing.invoice?.customerPhone || '—'}</div>
              <div className="col-md-6"><strong>Method:</strong> {viewing.payment.paymentMethod}</div>
              <div className="col-md-6"><strong>Reference:</strong> {viewing.payment.transactionReference || '—'}</div>
              <div className="col-md-6"><strong>Received By:</strong> {viewing.payment.receivedByName || '—'}</div>
              {viewing.payment.notes && <div className="col-12"><strong>Notes:</strong> {viewing.payment.notes}</div>}
            </div>
            <div className="d-flex justify-content-between"><span>Amount Received</span><strong>{Number(viewing.payment.amount ?? 0).toFixed(2)}</strong></div>
            {viewing.invoice && (
              <>
                <div className="d-flex justify-content-between"><span>Invoice Grand Total</span><span>{Number(viewing.invoice.grandTotal ?? 0).toFixed(2)}</span></div>
                <div className="d-flex justify-content-between"><span>Total Paid to Date</span><span>{Number(viewing.invoice.paidAmount ?? 0).toFixed(2)}</span></div>
                <div className="d-flex justify-content-between">
                  <span>{balanceLabel(viewing.invoice.balanceAmount).label}</span>
                  <strong className={balanceLabel(viewing.invoice.balanceAmount).label === 'Overpayment / Credit' ? 'text-info' : ''}>
                    {balanceLabel(viewing.invoice.balanceAmount).value.toFixed(2)}
                  </strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Payment Status</span>
                  <span className={`badge ${viewing.invoice.paymentStatus === 'PAID' ? 'bg-success' : viewing.invoice.paymentStatus === 'PARTIAL' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                    {viewing.invoice.paymentStatus}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
