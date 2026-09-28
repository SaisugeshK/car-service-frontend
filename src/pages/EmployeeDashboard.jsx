import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { FiClipboard, FiCalendar, FiCheckCircle, FiAlertCircle, FiDollarSign, FiPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import jobCardsService from '../services/jobCardsService';
import appointmentsService from '../services/appointmentsService';
import attendanceService from '../services/attendanceService';
import complaintsService from '../services/complaintsService';
import expensesService, { categoryLabel } from '../services/expensesService';
import Loader from '../components/Loader';

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);
const CLOSED = ['DELIVERED', 'CANCELLED'];
const STATUS_BADGE = {
  RECEIVED: 'bg-secondary', INSPECTION: 'bg-info text-dark', IN_PROGRESS: 'bg-primary',
  WAITING_FOR_PARTS: 'bg-warning text-dark', QUALITY_CHECK: 'bg-warning text-dark', READY_FOR_DELIVERY: 'bg-success',
};

function Stat({ icon: Icon, label, value, to }) {
  const body = (
    <div className="erp-stat-card h-100">
      <div className="d-flex align-items-center gap-2 text-secondary small"><Icon size={14} /> {label}</div>
      <div className="erp-stat-value">{value}</div>
    </div>
  );
  return <div className="col-6 col-lg-3">{to ? <Link to={to} className="text-decoration-none text-reset">{body}</Link> : body}</div>;
}

// An EMPLOYEE's home: their assigned work and their own attendance. No revenue, billing or salary
// figures — every call here hits an endpoint the backend already scopes to this user.
export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    const safe = (p) => p.then(asList).catch(() => []);
    Promise.all([
      safe(jobCardsService.getAll()),
      safe(appointmentsService.getAll()),
      safe(attendanceService.getMine()),
      safe(complaintsService.getAll()),
      safe(expensesService.getAll()),
    ]).then(([jobCards, appointments, attendance, complaints, expenses]) => setData({ jobCards, appointments, attendance, complaints, expenses }));
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const today = dayjs().format('YYYY-MM-DD');
    const thisMonth = dayjs().format('YYYY-MM');
    const openJobs = data.jobCards
      .filter((j) => !CLOSED.includes(j.status))
      .sort((a, b) => new Date(a.expectedDelivery || '2999-01-01') - new Date(b.expectedDelivery || '2999-01-01'));
    const dueToday = openJobs.filter((j) => j.expectedDelivery && dayjs(j.expectedDelivery).format('YYYY-MM-DD') <= today);
    const upcomingAppointments = data.appointments
      .filter((a) => a.appointmentDate >= today && a.status !== 'CANCELLED')
      .sort((a, b) => `${a.appointmentDate} ${a.appointmentTime || ''}`.localeCompare(`${b.appointmentDate} ${b.appointmentTime || ''}`));
    const presentThisMonth = data.attendance.filter((r) => r.status === 'PRESENT' && dayjs(r.attendanceDate).format('YYYY-MM') === thisMonth).length;
    const openComplaints = data.complaints.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;
    // The API only ever returns this user's own expenses.
    const myExpenses = data.expenses.slice(0, 5);
    return { openJobs, dueToday, upcomingAppointments, presentThisMonth, openComplaints, myExpenses };
  }, [data]);

  if (!view) return <Loader label="Loading your dashboard..." />;

  return (
    <div>
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title">Welcome, {user?.username || 'there'}</h1>
          <div className="text-secondary small">{dayjs().format('dddd, DD MMM YYYY')}</div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <Stat icon={FiClipboard} label="My Open Job Cards" value={view.openJobs.length} to="/job-cards" />
        <Stat icon={FiCheckCircle} label="Due Today / Overdue" value={view.dueToday.length} to="/job-cards" />
        <Stat icon={FiCalendar} label="Upcoming Appointments" value={view.upcomingAppointments.length} to="/appointments" />
        <Stat icon={FiAlertCircle} label="Open Complaints" value={view.openComplaints} to="/complaints" />
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="erp-card p-3 h-100">
            <h6 className="mb-3">My Job Cards</h6>
            {view.openJobs.length === 0 ? (
              <p className="text-secondary small mb-0">No open job cards assigned to you.</p>
            ) : (
              <div className="list-group list-group-flush">
                {view.openJobs.slice(0, 8).map((j) => (
                  <button
                    key={j.jobCardId}
                    type="button"
                    className="list-group-item list-group-item-action d-flex justify-content-between align-items-center px-0"
                    onClick={() => navigate(`/job-cards/${j.jobCardId}`)}
                  >
                    <span>
                      <strong>{j.jobCardNumber}</strong> · {j.vehicleModel} <span className="text-secondary">({j.registrationNumber})</span>
                      {j.expectedDelivery && <div className="small text-secondary">Due {dayjs(j.expectedDelivery).format('DD MMM YYYY')}</div>}
                    </span>
                    <span className={`badge ${STATUS_BADGE[j.status] || 'bg-secondary'}`}>{j.status.replace(/_/g, ' ')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="col-lg-5 d-flex flex-column gap-3">
          <div className="erp-card p-3">
            <h6 className="mb-3">Upcoming Appointments</h6>
            {view.upcomingAppointments.length === 0 ? (
              <p className="text-secondary small mb-0">None scheduled for you.</p>
            ) : (
              <ul className="list-unstyled small mb-0">
                {view.upcomingAppointments.slice(0, 5).map((a) => (
                  <li key={a.appointmentId} className="d-flex justify-content-between mb-2">
                    <span>{a.customerName} · {a.vehicleModel || a.requestedService || '—'}</span>
                    <span className="text-secondary">{dayjs(a.appointmentDate).format('DD MMM')}{a.appointmentTime ? `, ${String(a.appointmentTime).slice(0, 5)}` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="erp-card p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">My Expenses</h6>
              <Link to="/expenses" className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"><FiPlus size={13} /> Add</Link>
            </div>
            {view.myExpenses.length === 0 ? (
              <p className="text-secondary small mb-0">You haven&apos;t recorded any expenses.</p>
            ) : (
              <ul className="list-unstyled small mb-0">
                {view.myExpenses.map((e) => (
                  <li key={e.expenseId} className="d-flex justify-content-between mb-1">
                    <span className="text-truncate me-2">{e.title} <span className="text-secondary">· {categoryLabel(e.category)}</span></span>
                    <span className="text-nowrap">₹{Number(e.amount).toFixed(2)} <span className="text-secondary">{dayjs(e.expenseDate).format('DD MMM')}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="erp-card p-3">
            <h6 className="mb-2">My Attendance</h6>
            <div className="small mb-2">Present this month: <strong>{view.presentThisMonth} days</strong></div>
            <div className="d-flex gap-2">
              <Link to="/my-attendance" className="btn btn-sm btn-outline-primary">Attendance &amp; Leave</Link>
              <Link to="/my-payslips" className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"><FiDollarSign size={13} /> My Payslips</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
