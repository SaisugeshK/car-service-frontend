import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';
import attendanceService from '../services/attendanceService';
import leaveRequestsService from '../services/leaveRequestsService';
import overtimeService from '../services/overtimeService';

const STATUS_META = {
  PRESENT: { label: 'Present', badge: 'bg-success' },
  ABSENT: { label: 'Absent', badge: 'bg-danger' },
  WEEK_OFF: { label: 'Week Off', badge: 'bg-secondary' },
  HOLIDAY: { label: 'Holiday', badge: 'bg-info text-dark' },
};

// An EMPLOYEE's own attendance, leave and overtime, read-only. The /my endpoints resolve the user
// from the JWT server-side — this page never sends a userId and can't see anyone else's records.
// Overtime pay amounts are left off: salary figures live on the payslip only.
export default function MyAttendance() {
  const [records, setRecords] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [tab, setTab] = useState('Attendance');

  const load = () => {
    setLoadError(false);
    attendanceService.getMine()
      .then((data) => setRecords(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setLoadError(true));
  };

  useEffect(load, []);

  const monthRows = useMemo(
    () => (records || [])
      .filter((r) => dayjs(r.attendanceDate).format('YYYY-MM') === month)
      .sort((a, b) => (a.attendanceDate < b.attendanceDate ? 1 : -1)),
    [records, month],
  );

  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, WEEK_OFF: 0, HOLIDAY: 0 };
    monthRows.forEach((r) => { if (c[r.status] !== undefined) c[r.status] += 1; });
    return c;
  }, [monthRows]);

  if (loadError) return <ErrorPage message="Could not load your attendance. Check your connection and try again." onRetry={load} />;
  if (!records) return <Loader label="Loading your attendance..." />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">My Attendance &amp; Leave</h1>
        {tab === 'Attendance' && (
          <input
            type="month"
            className="form-control"
            style={{ maxWidth: 200 }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Month"
          />
        )}
      </div>

      <ul className="nav nav-tabs mb-3">
        {['Attendance', 'Leave', 'Overtime'].map((t) => (
          <li className="nav-item" key={t}>
            <button className={`nav-link ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          </li>
        ))}
      </ul>

      {tab === 'Leave' && <MyLeave />}
      {tab === 'Overtime' && <MyOvertime />}
      {tab === 'Attendance' && (
      <>

      <div className="row g-3 mb-3">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div className="col-6 col-md-3" key={key}>
            <div className="erp-card p-3 text-center">
              <div className="fs-4 fw-bold">{counts[key]}</div>
              <div className="small text-secondary">{meta.label}</div>
            </div>
          </div>
        ))}
      </div>

      <DataTable
        keyField="attendanceId"
        emptyTitle="No attendance for this month"
        emptyMessage="Attendance marked for you will appear here."
        columns={[
          { key: 'attendanceDate', label: 'Date', render: (row) => dayjs(row.attendanceDate).format('ddd, DD MMM YYYY') },
          {
            key: 'status',
            label: 'Status',
            render: (row) => {
              const meta = STATUS_META[row.status] || { label: row.status, badge: 'bg-secondary' };
              return <span className={`badge ${meta.badge}`}>{meta.label}</span>;
            },
          },
          { key: 'notes', label: 'Notes', render: (row) => row.notes || '—' },
        ]}
        rows={monthRows}
      />
      </>
      )}
    </div>
  );
}

const APPROVAL_BADGE = { APPROVED: 'bg-success', REJECTED: 'bg-danger', PENDING: 'bg-warning text-dark' };
const approvalBadge = (status) => <span className={`badge ${APPROVAL_BADGE[status] || 'bg-secondary'}`}>{status}</span>;

// Read-only list of the logged-in user's own records from a /my endpoint.
function useMine(fetchMine) {
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetchMine()
      .then((data) => setRows(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setFailed(true));
  }, [fetchMine]);
  return { rows, failed };
}

function MyLeave() {
  const { rows, failed } = useMine(leaveRequestsService.getMine);
  if (failed) return <p className="text-danger small">Could not load your leave requests.</p>;
  if (!rows) return <Loader label="Loading your leave..." />;
  return (
    <DataTable
      keyField="leaveId"
      emptyTitle="No leave requests"
      emptyMessage="Leave recorded for you will appear here."
      columns={[
        { key: 'leaveType', label: 'Type' },
        { key: 'startDate', label: 'From', render: (row) => dayjs(row.startDate).format('DD MMM YYYY') },
        { key: 'endDate', label: 'To', render: (row) => dayjs(row.endDate).format('DD MMM YYYY') },
        { key: 'numberOfDays', label: 'Days' },
        { key: 'reason', label: 'Reason', render: (row) => row.reason || '—' },
        { key: 'status', label: 'Status', render: (row) => approvalBadge(row.status) },
      ]}
      rows={[...rows].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))}
    />
  );
}

function MyOvertime() {
  const { rows, failed } = useMine(overtimeService.getMine);
  if (failed) return <p className="text-danger small">Could not load your overtime.</p>;
  if (!rows) return <Loader label="Loading your overtime..." />;
  return (
    <DataTable
      keyField="overtimeId"
      emptyTitle="No overtime"
      emptyMessage="Overtime recorded for you will appear here."
      columns={[
        { key: 'workDate', label: 'Date', render: (row) => dayjs(row.workDate).format('DD MMM YYYY') },
        { key: 'hours', label: 'Hours', render: (row) => Number(row.hours ?? 0).toFixed(1) },
        { key: 'notes', label: 'Notes', render: (row) => row.notes || '—' },
        { key: 'status', label: 'Status', render: (row) => approvalBadge(row.status) },
      ]}
      rows={[...rows].sort((a, b) => (a.workDate < b.workDate ? 1 : -1))}
    />
  );
}
