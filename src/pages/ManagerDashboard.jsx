import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiClipboard, FiCheckSquare, FiFileText, FiClock, FiCheckCircle, FiTruck,
  FiAlertTriangle, FiTool, FiCreditCard, FiAlertCircle, FiBell, FiUsers,
} from 'react-icons/fi';
import jobCardsService from '../services/jobCardsService';
import estimatesService from '../services/estimatesService';
import invoicesService from '../services/invoicesService';
import complaintsService from '../services/complaintsService';
import serviceRemindersService from '../services/serviceRemindersService';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const asList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);
const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};
const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({ icon: Icon, label, value, sub, to, color, bgColor }) {
  const content = (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e2e8f0',
      boxShadow: '0 2px 12px rgba(37,99,235,0.06)', display: 'flex', alignItems: 'center', gap: 14, height: '100%',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, background: bgColor || 'rgba(37,99,235,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} color={color || '#2563eb'} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1.1, overflowWrap: 'break-word' }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>{content}</Link> : content;
}

// Phase 21 — Manager sees today's operational picture only: what needs attention right now
// (approvals, parts, QC, complaints, reminders, workload). No revenue/profit/financial-report
// figures anywhere on this page — that's the SUPER_ADMIN dashboard's job, not this one.
export default function ManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: true, error: null, jobCards: [], estimates: [], invoices: [], complaints: [], reminders: [],
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      jobCardsService.getAll(),
      estimatesService.getAll(),
      invoicesService.getAll(),
      complaintsService.getAll(),
      serviceRemindersService.getAll(),
    ])
      .then(([jobCards, estimates, invoices, complaints, reminders]) => {
        if (cancelled) return;
        setState({
          loading: false, error: null,
          jobCards: asList(jobCards), estimates: asList(estimates), invoices: asList(invoices),
          complaints: asList(complaints), reminders: asList(reminders),
        });
      })
      .catch((error) => { if (!cancelled) setState((s) => ({ ...s, loading: false, error })); });
    return () => { cancelled = true; };
  }, []);

  const { jobCards, estimates, invoices, complaints, reminders } = state;

  const stats = useMemo(() => {
    const todaysJobs = jobCards.filter((j) => isToday(j.dateIn || j.createdAt));
    const byStatus = (s) => jobCards.filter((j) => j.status === s);
    const todaysInvoices = invoices.filter((i) => isToday(i.invoiceDate || i.createdAt) && i.status !== 'CANCELLED');
    const pendingPayments = invoices.filter((i) => i.status !== 'CANCELLED' && Number(i.balanceAmount || 0) > 0);

    return {
      todaysJobs: todaysJobs.length,
      pendingInspections: byStatus('RECEIVED').length + byStatus('INSPECTION').length,
      pendingEstimates: estimates.filter((e) => e.status === 'PENDING').length,
      approvalPending: byStatus('WAITING_APPROVAL').length,
      approvedJobs: byStatus('APPROVED').length,
      inProgress: byStatus('IN_PROGRESS').length,
      waitingParts: byStatus('WAITING_FOR_PARTS').length,
      additionalApproval: byStatus('ADDITIONAL_APPROVAL_REQUIRED').length,
      qualityChecks: byStatus('QUALITY_CHECK').length,
      readyForDelivery: byStatus('READY_FOR_DELIVERY').length,
      todaysBillingCount: todaysInvoices.length,
      todaysBillingAmount: todaysInvoices.reduce((s, i) => s + Number(i.grandTotal || 0), 0),
      pendingPaymentsCount: pendingPayments.length,
      pendingPaymentsAmount: pendingPayments.reduce((s, i) => s + Number(i.balanceAmount || 0), 0),
      openComplaints: complaints.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length,
      dueReminders: reminders.filter((r) => r.status === 'OVERDUE' || r.status === 'DUE').length,
    };
  }, [jobCards, estimates, invoices, complaints, reminders]);

  const technicianWorkload = useMemo(() => {
    const active = jobCards.filter((j) => !['DELIVERED', 'CANCELLED'].includes(j.status));
    const byTech = new Map();
    active.forEach((j) => {
      const name = j.technicianName || 'Unassigned';
      byTech.set(name, (byTech.get(name) || 0) + 1);
    });
    return [...byTech.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [jobCards]);

  if (state.loading) return <Loader label="Loading dashboard..." />;
  if (state.error) return <ErrorPage message="Could not load dashboard data from the backend." />;

  return (
    <div>
      <div className="mb-4">
        <h1 className="erp-page-title mb-1">{greeting()}, {user?.username || 'Manager'}</h1>
        <p className="text-secondary small mb-0">Today&apos;s workshop operations at a glance.</p>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiClipboard} label="Today's Jobs" value={stats.todaysJobs} to="/job-cards" color="#2563eb" bgColor="rgba(37,99,235,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiCheckSquare} label="Pending Inspections" value={stats.pendingInspections} to="/inspections" color="#0ea5e9" bgColor="rgba(14,165,233,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiFileText} label="Pending Estimates" value={stats.pendingEstimates} to="/estimates" color="#f59e0b" bgColor="rgba(245,158,11,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiClock} label="Approval Pending" value={stats.approvalPending} to="/workshop-board" color="#f59e0b" bgColor="rgba(245,158,11,0.1)" />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiCheckCircle} label="Approved Jobs" value={stats.approvedJobs} to="/workshop-board" color="#16a34a" bgColor="rgba(22,163,74,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiTool} label="Jobs In Progress" value={stats.inProgress} to="/workshop-board" color="#2563eb" bgColor="rgba(37,99,235,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiTruck} label="Waiting for Parts" value={stats.waitingParts} to="/workshop-board" color="#f59e0b" bgColor="rgba(245,158,11,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiAlertTriangle} label="Additional Approval Requests" value={stats.additionalApproval} to="/workshop-board" color="#dc2626" bgColor="rgba(220,38,38,0.1)" />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiCheckSquare} label="Quality Checks" value={stats.qualityChecks} to="/workshop-board" color="#8b5cf6" bgColor="rgba(139,92,246,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiCheckCircle} label="Ready for Delivery" value={stats.readyForDelivery} to="/workshop-board" color="#16a34a" bgColor="rgba(22,163,74,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiFileText} label="Today's Billing" value={stats.todaysBillingCount} sub={currency(stats.todaysBillingAmount)} to="/invoices" color="#2563eb" bgColor="rgba(37,99,235,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiCreditCard} label="Pending Payments" value={stats.pendingPaymentsCount} sub={currency(stats.pendingPaymentsAmount)} to="/payments" color="#dc2626" bgColor="rgba(220,38,38,0.1)" />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiAlertCircle} label="Customer Complaints" value={stats.openComplaints} to="/complaints" color="#dc2626" bgColor="rgba(220,38,38,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiBell} label="Service Reminders Due" value={stats.dueReminders} to="/service-reminders" color="#f59e0b" bgColor="rgba(245,158,11,0.1)" />
        </div>
      </div>

      <div className="erp-card p-3">
        <h6 className="mb-3 d-flex align-items-center gap-2"><FiUsers /> Technician Workload (Active Jobs)</h6>
        {technicianWorkload.length === 0 ? (
          <p className="text-secondary small mb-0">No active jobs assigned right now.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {technicianWorkload.map((t) => {
              const max = technicianWorkload[0].count || 1;
              const pct = Math.round((t.count / max) * 100);
              return (
                <div key={t.name} className="d-flex align-items-center gap-2 small" style={{ cursor: 'pointer' }} onClick={() => navigate('/workshop-board')}>
                  <span style={{ width: 140 }} className="fw-semibold text-truncate">{t.name}</span>
                  <div className="flex-grow-1" style={{ background: '#e2e8f0', borderRadius: 4, height: 10 }}>
                    <div style={{ width: `${pct}%`, background: '#2563eb', height: 10, borderRadius: 4 }} />
                  </div>
                  <span className="text-secondary" style={{ width: 28, textAlign: 'right' }}>{t.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
