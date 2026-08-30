import { useEffect, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';
import payrollService from '../services/payrollService';
import { downloadPayslipPdf } from '../utils/payslipPdf';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// HRM/payroll — an EMPLOYEE's own payroll history (spec §24). Calls GET /api/payroll/my, which
// the backend resolves to "whoever the JWT says this is" — this page never sends a userId, and
// couldn't reach anyone else's records even if it tried (spec §25, enforced server-side).
export default function MyPayslips() {
  const [payments, setPayments] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoadError(false);
    payrollService.myPayslips()
      .then((data) => setPayments(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setLoadError(true));
  };

  useEffect(load, []);

  if (loadError) return <ErrorPage message="Could not load your payslips. Check your connection and try again." onRetry={load} />;
  if (!payments) return <Loader label="Loading your payslips..." />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">My Payslips</h1>
      </div>

      <DataTable
        keyField="salaryPaymentId"
        emptyTitle="No payslips yet"
        emptyMessage="Your payslips will appear here once payroll has been generated for you."
        columns={[
          {
            key: 'payPeriodMonth',
            label: 'Period',
            render: (row) => `${MONTH_NAMES[(row.payPeriodMonth || 1) - 1]} ${row.payPeriodYear}`,
          },
          { key: 'grossPay', label: 'Gross', render: (row) => Number(row.grossPay ?? 0).toFixed(2) },
          {
            key: 'deductions',
            label: 'Deductions',
            render: (row) => (Number(row.deductions ?? 0) + Number(row.attendanceDeductions ?? 0) + Number(row.leaveDeductions ?? 0)).toFixed(2),
          },
          { key: 'netPay', label: 'Net Pay', render: (row) => Number(row.netPay ?? 0).toFixed(2) },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <span className={`badge ${row.status === 'PAID' ? 'bg-success' : row.status === 'CANCELLED' ? 'bg-danger' : 'bg-secondary'}`}>
                {row.status}
              </span>
            ),
          },
          {
            key: 'actions',
            label: 'Payslip',
            render: (row) => (
              <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={() => downloadPayslipPdf(row)}>
                <FiDownload size={13} /> Download
              </button>
            ),
          },
        ]}
        rows={payments}
      />
    </div>
  );
}
