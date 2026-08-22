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
  FiStar,
} from 'react-icons/fi';
import { FaCarSide } from 'react-icons/fa';
import jobCardsService from '../services/jobCardsService';
import appointmentsService from '../services/appointmentsService';
import invoicesService from '../services/invoicesService';
import productsService from '../services/productsService';
import reviewsService from '../services/reviewsService';
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
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [state, setState] = useState({ loading: true, error: null, jobCards: [], appointments: [], invoices: [], products: [], reviews: [] });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      jobCardsService.getAll(),
      appointmentsService.getAll(),
      invoicesService.getAll(),
      productsService.getAll({ itemType: 'PRODUCT' }),
      reviewsService.getAll(),
    ])
      .then(([jobCards, appointments, invoices, products, reviews]) => {
        if (cancelled) return;
        setState({
          loading: false, error: null, jobCards: asList(jobCards), appointments: asList(appointments),
          invoices: asList(invoices), products: asList(products), reviews: asList(reviews),
        });
      })
      .catch((error) => { if (!cancelled) setState((s) => ({ ...s, loading: false, error })); });
    return () => { cancelled = true; };
  }, []);

  const { jobCards, appointments, invoices, products, reviews } = state;

  // Vehicle-type filter applies to job-card and invoice derived KPIs; appointments/products
  // don't carry vehicleCategory on this DTO shape so they stay unfiltered.
  const scopedJobCards = useMemo(
    () => (typeFilter === 'ALL' ? jobCards : jobCards.filter((j) => j.vehicleCategory === typeFilter)),
    [jobCards, typeFilter]
  );
  const scopedInvoices = useMemo(
    () => (typeFilter === 'ALL' ? invoices : invoices.filter((i) => i.vehicleCategory === typeFilter)),
    [invoices, typeFilter]
  );

  const kpis = useMemo(() => {
    const todaysInvoices = scopedInvoices.filter((i) => isToday(i.createdAt) && i.status !== 'CANCELLED');
    const todaysRevenue = todaysInvoices.reduce((s, i) => s + Number(i.grandTotal || 0), 0);
    const serviceRevenue = todaysInvoices.reduce((s, i) => s + Number(i.serviceSubtotal || 0), 0);
    const partsRevenue = todaysInvoices.reduce((s, i) => s + Number(i.productSubtotal || 0), 0);
    const todaysPayments = todaysInvoices.reduce((s, i) => s + Number(i.paidAmount || 0), 0);
    const outstanding = scopedInvoices.filter((i) => i.status !== 'CANCELLED').reduce((s, i) => s + Number(i.balanceAmount || 0), 0);

    const active = scopedJobCards.filter((j) => !['DELIVERED', 'CANCELLED'].includes(j.status));
    const carsInWorkshop = active.length;
    const readyForDelivery = scopedJobCards.filter((j) => j.status === 'READY_FOR_DELIVERY').length;
    const inProgress = scopedJobCards.filter((j) => j.status === 'IN_PROGRESS').length;
    const waitingApproval = scopedJobCards.filter((j) => j.status === 'WAITING_APPROVAL').length;
    const waitingParts = scopedJobCards.filter((j) => j.status === 'WAITING_FOR_PARTS').length;

    const todaysAppointments = appointments.filter((a) => isToday(a.appointmentDate)).length;
    const lowStock = products.filter((p) => Number(p.stockQuantity) <= Number(p.minimumStock));

    return {
      todaysRevenue, serviceRevenue, partsRevenue, todaysPayments, outstanding,
      carsInWorkshop, readyForDelivery, inProgress, waitingApproval, waitingParts,
      todaysAppointments, lowStock,
    };
  }, [scopedJobCards, appointments, scopedInvoices, products]);

  const recentJobCards = useMemo(
    () => [...scopedJobCards].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6),
    [scopedJobCards]
  );

  const ratingStats = useMemo(() => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    reviews.forEach((r) => {
      const n = Number(r.rating);
      if (n >= 1 && n <= 5) {
        distribution[n] += 1;
        sum += n;
      }
    });
    const total = reviews.length;
    const average = total > 0 ? sum / total : 0;
    const recent = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    const negative = [...reviews].filter((r) => Number(r.rating) <= 2).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    return { distribution, total, average, recent, negative };
  }, [reviews]);

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
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="btn-group" role="group" aria-label="Filter by vehicle type">
            {['ALL', 'CAR', 'BIKE'].map((v) => (
              <button
                key={v}
                type="button"
                className={`btn btn-sm ${typeFilter === v ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setTypeFilter(v)}
              >
                {v === 'ALL' ? 'All' : v === 'CAR' ? 'Car' : 'Bike'}
              </button>
            ))}
          </div>
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

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiStar} label="Average Rating" value={ratingStats.total > 0 ? `${ratingStats.average.toFixed(1)} / 5` : '—'} to="/reviews" color="#f59e0b" bgColor="rgba(245,158,11,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiUserCheck} label="Total Reviews" value={ratingStats.total} to="/reviews" color="#8b5cf6" bgColor="rgba(139,92,246,0.1)" />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <div className="erp-card p-3">
            <h6 className="mb-3">Rating Distribution</h6>
            {ratingStats.total === 0 ? (
              <p className="text-secondary small mb-0">No reviews yet.</p>
            ) : (
              [5, 4, 3, 2, 1].map((n) => {
                const count = ratingStats.distribution[n];
                const pct = ratingStats.total > 0 ? Math.round((count / ratingStats.total) * 100) : 0;
                return (
                  <div key={n} className="d-flex align-items-center gap-2 mb-1 small">
                    <span style={{ width: 42 }}>{n} star</span>
                    <div className="flex-grow-1" style={{ background: '#e2e8f0', borderRadius: 4, height: 8 }}>
                      <div style={{ width: `${pct}%`, background: n <= 2 ? '#dc2626' : '#f59e0b', height: 8, borderRadius: 4 }} />
                    </div>
                    <span className="text-secondary" style={{ width: 32, textAlign: 'right' }}>{count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="col-lg-6">
          <div className="erp-card p-3">
            <h6 className="mb-3 d-flex align-items-center gap-2">
              Recent Negative Reviews
              {ratingStats.negative.length > 0 && <span className="badge bg-danger">{ratingStats.negative.length}</span>}
            </h6>
            {ratingStats.negative.length === 0 ? (
              <p className="text-secondary small mb-0">No negative reviews (≤2★) on record.</p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {ratingStats.negative.map((r) => (
                  <div key={r.reviewId} className="border-bottom pb-2">
                    <div className="d-flex justify-content-between small">
                      <span className="fw-semibold">{r.customerName || 'Customer'}</span>
                      <span className="badge bg-danger">{r.rating}★</span>
                    </div>
                    {r.comment && <div className="small text-secondary">{r.comment}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
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
