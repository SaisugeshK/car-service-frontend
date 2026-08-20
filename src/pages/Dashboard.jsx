import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiClipboard,
  FiCalendar,
  FiUserCheck,
  FiTruck,
  FiFileText,
  FiShoppingCart,
  FiDollarSign,
  FiAlertTriangle,
  FiTrendingUp,
  FiTool,
  FiCheckCircle,
  FiClock,
} from 'react-icons/fi';
import { FaCarSide } from 'react-icons/fa';
import jobCardsService from '../services/jobCardsService';
import appointmentsService from '../services/appointmentsService';
import invoicesService from '../services/invoicesService';
import productsService from '../services/productsService';
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

function StatCard({ icon: Icon, label, value, to, color, bgColor }) {
  const content = (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #e2e8f0',
      boxShadow: '0 2px 12px rgba(37,99,235,0.06)', display: 'flex', alignItems: 'center', gap: 14,
      height: '100%', transition: 'transform 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
    >
      <div style={{
        width: 46, height: 46, borderRadius: 12, background: bgColor || 'rgba(37,99,235,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} color={color || '#2563eb'} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
      </div>
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>{content}</Link> : content;
}

function QuickAction({ icon: Icon, label, to }) {
  const navigate = useNavigate();
  return (
    <button
      className="btn btn-outline-primary d-flex align-items-center gap-2"
      style={{ padding: '10px 16px', borderRadius: 10, fontWeight: 600, fontSize: '0.85rem' }}
      onClick={() => navigate(to)}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: null, jobCards: [], appointments: [], invoices: [], products: [] });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      jobCardsService.getAll(),
      appointmentsService.getAll(),
      invoicesService.getAll(),
      productsService.getAll({ itemType: 'PRODUCT' }),
    ])
      .then(([jobCards, appointments, invoices, products]) => {
        if (cancelled) return;
        setState({ loading: false, error: null, jobCards: asList(jobCards), appointments: asList(appointments), invoices: asList(invoices), products: asList(products) });
      })
      .catch((error) => { if (!cancelled) setState((s) => ({ ...s, loading: false, error })); });
    return () => { cancelled = true; };
  }, []);

  const { jobCards, appointments, invoices, products } = state;

  const kpis = useMemo(() => {
    const todaysInvoices = invoices.filter((i) => isToday(i.createdAt) && i.status !== 'CANCELLED');
    const todaysRevenue = todaysInvoices.reduce((s, i) => s + Number(i.grandTotal || 0), 0);
    const serviceRevenue = todaysInvoices.reduce((s, i) => s + Number(i.serviceSubtotal || 0), 0);
    const partsRevenue = todaysInvoices.reduce((s, i) => s + Number(i.productSubtotal || 0), 0);
    const todaysPayments = todaysInvoices.reduce((s, i) => s + Number(i.paidAmount || 0), 0);
    const outstanding = invoices.filter((i) => i.status !== 'CANCELLED').reduce((s, i) => s + Number(i.balanceAmount || 0), 0);

    const active = jobCards.filter((j) => !['DELIVERED', 'CANCELLED'].includes(j.status));
    const carsInWorkshop = active.length;
    const readyForDelivery = jobCards.filter((j) => j.status === 'READY_FOR_DELIVERY').length;
    const inProgress = jobCards.filter((j) => j.status === 'IN_PROGRESS').length;
    const waitingApproval = jobCards.filter((j) => j.status === 'WAITING_APPROVAL').length;
    const waitingParts = jobCards.filter((j) => j.status === 'WAITING_FOR_PARTS').length;

    const todaysAppointments = appointments.filter((a) => isToday(a.appointmentDate)).length;
    const lowStock = products.filter((p) => Number(p.stockQuantity) <= Number(p.minimumStock));

    return {
      todaysRevenue, serviceRevenue, partsRevenue, todaysPayments, outstanding,
      carsInWorkshop, readyForDelivery, inProgress, waitingApproval, waitingParts,
      todaysAppointments, lowStock,
    };
  }, [jobCards, appointments, invoices, products]);

  const recentJobCards = useMemo(
    () => [...jobCards].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6),
    [jobCards]
  );

  const STATUS_TONE = {
    RECEIVED: 'bg-secondary', INSPECTION: 'bg-info text-dark', ESTIMATE: 'bg-info text-dark',
    WAITING_APPROVAL: 'bg-warning text-dark', APPROVED: 'bg-primary', IN_PROGRESS: 'bg-primary',
    WAITING_FOR_PARTS: 'bg-warning text-dark', QUALITY_CHECK: 'bg-warning text-dark',
    READY_FOR_DELIVERY: 'bg-success', DELIVERED: 'bg-success', CANCELLED: 'bg-danger',
  };

  if (state.loading) return <Loader label="Loading dashboard..." />;
  if (state.error) return <ErrorPage message="Could not load dashboard data from the backend." />;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="erp-page-title mb-1">{greeting()}, {user?.username || 'Admin'}</h1>
          <p className="text-secondary small mb-0">Here&apos;s what&apos;s happening at your service center today.</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <QuickAction icon={FiClipboard} label="New Job Card" to="/job-cards" />
          <QuickAction icon={FiCalendar} label="New Appointment" to="/appointments" />
          <QuickAction icon={FiUserCheck} label="New Customer" to="/customers" />
          <QuickAction icon={FaCarSide} label="New Vehicle" to="/vehicles" />
          <QuickAction icon={FiShoppingCart} label="Add Purchase" to="/purchases" />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiTrendingUp} label="Today's Revenue" value={currency(kpis.todaysRevenue)} to="/invoices" color="#2563eb" bgColor="rgba(37,99,235,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiTool} label="Service Revenue" value={currency(kpis.serviceRevenue)} color="#0ea5e9" bgColor="rgba(14,165,233,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiFileText} label="Parts Revenue" value={currency(kpis.partsRevenue)} color="#8b5cf6" bgColor="rgba(139,92,246,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiDollarSign} label="Today's Payments" value={currency(kpis.todaysPayments)} to="/payments" color="#16a34a" bgColor="rgba(22,163,74,0.1)" />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiAlertTriangle} label="Outstanding Amount" value={currency(kpis.outstanding)} to="/invoices" color="#dc2626" bgColor="rgba(220,38,38,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FaCarSide} label="Cars in Workshop" value={kpis.carsInWorkshop} to="/workshop-board" color="#2563eb" bgColor="rgba(37,99,235,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiCheckCircle} label="Ready for Delivery" value={kpis.readyForDelivery} to="/workshop-board" color="#16a34a" bgColor="rgba(22,163,74,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiClock} label="Waiting for Approval" value={kpis.waitingApproval} to="/estimates" color="#f59e0b" bgColor="rgba(245,158,11,0.1)" />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiTool} label="Jobs In Progress" value={kpis.inProgress} to="/workshop-board" color="#2563eb" bgColor="rgba(37,99,235,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiTruck} label="Waiting for Parts" value={kpis.waitingParts} to="/workshop-board" color="#f59e0b" bgColor="rgba(245,158,11,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiCalendar} label="Today's Appointments" value={kpis.todaysAppointments} to="/appointments" color="#0ea5e9" bgColor="rgba(14,165,233,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiAlertTriangle} label="Low Stock Parts" value={kpis.lowStock.length} to="/stock" color="#dc2626" bgColor="rgba(220,38,38,0.1)" />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="erp-card p-3">
            <h6 className="mb-3">Recent Job Cards</h6>
            {recentJobCards.length === 0 ? (
              <p className="text-secondary small mb-0">No job cards yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead><tr><th>Job Card</th><th>Vehicle</th><th>Status</th></tr></thead>
                  <tbody>
                    {recentJobCards.map((jc) => (
                      <tr key={jc.jobCardId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/job-cards/${jc.jobCardId}`)}>
                        <td className="fw-semibold">{jc.jobCardNumber}</td>
                        <td>{jc.vehicleModel} · {jc.registrationNumber}</td>
                        <td><span className={`badge ${STATUS_TONE[jc.status] || 'bg-secondary'}`}>{jc.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="erp-card p-3">
            <h6 className="mb-3">Low Stock Parts</h6>
            {kpis.lowStock.length === 0 ? (
              <p className="text-secondary small mb-0">All products are above minimum stock level.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead><tr><th>Product</th><th>Stock</th><th>Min</th></tr></thead>
                  <tbody>
                    {kpis.lowStock.slice(0, 6).map((p) => (
                      <tr key={p.productId}>
                        <td>{p.productName}</td>
                        <td><span className="badge bg-danger">{p.stockQuantity}</span></td>
                        <td>{p.minimumStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
