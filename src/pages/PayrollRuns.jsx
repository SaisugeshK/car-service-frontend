import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { FiPlay, FiCheck, FiXCircle, FiDownload } from 'react-icons/fi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';
import payrollService from '../services/payrollService';
import usersService from '../services/usersService';
import { downloadPayslipPdf } from '../utils/payslipPdf';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER'];
const METHODS_REQUIRING_REFERENCE = ['BANK_TRANSFER', 'UPI', 'CHEQUE'];

// HRM/payroll — the admin payroll screen (spec §30/§31). Custom-built rather than CrudPage:
// there's no create/edit form here (records are generated, never hand-entered), and the
// Generate/Mark-Paid/Cancel/Download actions each carry their own confirmation flow.
export default function PayrollRuns() {
  const now = dayjs();
  const [year, setYear] = useState(now.year());
  const [month, setMonth] = useState(now.month() + 1);
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState('');
  const [payments, setPayments] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [payingRow, setPayingRow] = useState(null);
  const [cancellingRow, setCancellingRow] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const load = () => {
    setLoadError(false);
    const params = { year, month, status: status || undefined, userId: userId || undefined };
    payrollService.getAll(params)
      .then((data) => setPayments(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setLoadError(true));
  };

  useEffect(load, [year, month, status, userId]);
  useEffect(() => {
    usersService.getAll(undefined, { skipErrorToast: true })
      .then((data) => setUsers(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setUsers([]));
  }, []);

  const summary = useMemo(() => {
    const rows = payments || [];
    return {
      totalEmployees: new Set(rows.map((r) => r.userId)).size,
      totalGross: rows.reduce((s, r) => s + Number(r.grossPay ?? 0), 0),
      totalOvertime: rows.reduce((s, r) => s + Number(r.overtimeAmount ?? 0), 0),
      totalDeductions: rows.reduce((s, r) => s + Number(r.deductions ?? 0) + Number(r.attendanceDeductions ?? 0) + Number(r.leaveDeductions ?? 0), 0),
      totalNet: rows.reduce((s, r) => s + Number(r.netPay ?? 0), 0),
      pendingCount: rows.filter((r) => r.status === 'PENDING').length,
      paidCount: rows.filter((r) => r.status === 'PAID').length,
      cancelledCount: rows.filter((r) => r.status === 'CANCELLED').length,
    };
  }, [payments]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await payrollService.generate({ year, month });
      toast.success(
        `Payroll for ${MONTH_NAMES[month - 1]} ${year}: ${result.generatedCount} generated, `
          + `${result.alreadyExistedCount} already existed, ${result.failedCount} failed.`
      );
      load();
    } catch {
      // axios interceptor already toasts the error
    } finally {
      setGenerating(false);
    }
  };

  const openMarkPaid = (row) => {
    setPayingRow(row);
    setPaymentMethod('CASH');
    setPaymentReference('');
  };

  const submitMarkPaid = async () => {
    if (METHODS_REQUIRING_REFERENCE.includes(paymentMethod) && !paymentReference.trim()) {
      toast.error(`${paymentMethod} payments require a payment reference`);
      return;
    }
    setActionBusy(true);
    try {
      await payrollService.markPaid(payingRow.salaryPaymentId, { paymentMethod, paymentReference: paymentReference || null });
      toast.success('Payroll marked as paid');
      setPayingRow(null);
      load();
    } catch {
      // axios interceptor already toasts the error
    } finally {
      setActionBusy(false);
    }
  };

  const submitCancel = async () => {
    if (!cancellationReason.trim()) {
      toast.error('Cancellation reason is required');
      return;
    }
    setActionBusy(true);
    try {
      await payrollService.cancel(cancellingRow.salaryPaymentId, { cancellationReason });
      toast.success('Payroll cancelled');
      setCancellingRow(null);
      setCancellationReason('');
      load();
    } catch {
      // axios interceptor already toasts the error
    } finally {
      setActionBusy(false);
    }
  };

  if (loadError) return <ErrorPage message="Could not load payroll records. Check your connection and try again." onRetry={load} />;
  if (!payments) return <Loader label="Loading payroll..." />;

  const years = Array.from({ length: 6 }, (_, i) => now.year() - i);

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Payroll</h1>
        {/* Pre-deployment fix — four fixed-width selects + a button in a nowrap flex row
            overflowed the viewport on mobile (390px/375px, found via the responsive test sweep).
            flex-wrap lets them wrap onto multiple lines instead of forcing horizontal scroll,
            same pattern .erp-page-header itself already uses. */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <select className="form-select form-select-sm" style={{ width: 130 }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select className="form-select form-select-sm" style={{ width: 100 }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select className="form-select form-select-sm" style={{ width: 130 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select className="form-select form-select-sm" style={{ width: 160 }} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">All Employees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName || u.username}</option>
            ))}
          </select>
          <button className="btn btn-primary d-flex align-items-center gap-1" onClick={handleGenerate} disabled={generating}>
            <FiPlay /> {generating ? 'Generating...' : 'Generate This Month'}
          </button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {[
          { label: 'Employees', value: summary.totalEmployees },
          { label: 'Gross Pay', value: summary.totalGross.toFixed(2) },
          { label: 'Overtime', value: summary.totalOvertime.toFixed(2) },
          { label: 'Deductions', value: summary.totalDeductions.toFixed(2) },
          { label: 'Net Pay', value: summary.totalNet.toFixed(2) },
          { label: 'Pending / Paid / Cancelled', value: `${summary.pendingCount} / ${summary.paidCount} / ${summary.cancelledCount}` },
        ].map((tile) => (
          <div className="col-6 col-md-2" key={tile.label}>
            <div className="erp-card p-3 h-100">
              <div className="text-muted small">{tile.label}</div>
              <div className="fs-5 fw-semibold">{tile.value}</div>
            </div>
          </div>
        ))}
      </div>

      <DataTable
        keyField="salaryPaymentId"
        emptyTitle="No payroll records for this period"
        emptyMessage="Click &quot;Generate This Month&quot; to create payroll for every active employee."
        columns={[
          { key: 'paymentNumber', label: 'Payslip #' },
          { key: 'userId', label: 'Employee', render: (row) => row.userName || row.userId },
          { key: 'netPay', label: 'Net Pay', sortable: true, render: (row) => Number(row.netPay ?? 0).toFixed(2) },
          { key: 'grossPay', label: 'Gross Pay', render: (row) => Number(row.grossPay ?? 0).toFixed(2) },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <span className={`badge ${row.status === 'PAID' ? 'bg-success' : row.status === 'CANCELLED' ? 'bg-danger' : 'bg-secondary'}`}>
                {row.status}
              </span>
            ),
          },
          { key: 'generationSource', label: 'Source', render: (row) => row.generationSource || '—' },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="d-flex gap-1">
                <button className="btn btn-sm btn-outline-secondary" title="Download Payslip" onClick={() => downloadPayslipPdf(row)}>
                  <FiDownload size={13} />
                </button>
                {row.status === 'PENDING' && (
                  <>
                    <button className="btn btn-sm btn-outline-success" title="Mark Paid" onClick={() => openMarkPaid(row)}>
                      <FiCheck size={13} />
                    </button>
                    <button className="btn btn-sm btn-outline-danger" title="Cancel" onClick={() => setCancellingRow(row)}>
                      <FiXCircle size={13} />
                    </button>
                  </>
                )}
              </div>
            ),
          },
        ]}
        rows={payments}
      />

      <Modal
        show={Boolean(payingRow)}
        title={payingRow ? `Mark ${payingRow.paymentNumber} as Paid` : ''}
        onClose={() => setPayingRow(null)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPayingRow(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitMarkPaid} disabled={actionBusy}>{actionBusy ? 'Saving...' : 'Mark Paid'}</button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label">Payment Method</label>
          <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">
            Payment Reference {METHODS_REQUIRING_REFERENCE.includes(paymentMethod) && <span className="text-danger">*</span>}
          </label>
          <input className="form-control" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
        </div>
      </Modal>

      <Modal
        show={Boolean(cancellingRow)}
        title={cancellingRow ? `Cancel ${cancellingRow.paymentNumber}?` : ''}
        onClose={() => setCancellingRow(null)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCancellingRow(null)}>Close</button>
            <button className="btn btn-danger" onClick={submitCancel} disabled={actionBusy}>{actionBusy ? 'Cancelling...' : 'Cancel Payroll'}</button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label">Cancellation Reason <span className="text-danger">*</span></label>
          <textarea className="form-control" rows={3} value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
