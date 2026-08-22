import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  FiTrendingUp, FiDollarSign, FiAlertTriangle, FiTool, FiFileText, FiCreditCard,
  FiClipboard, FiUserCheck, FiRepeat, FiClock, FiCheckCircle, FiPackage, FiStar, FiAward,
} from 'react-icons/fi';
import { FaCarSide, FaMotorcycle } from 'react-icons/fa';
import jobCardsService from '../services/jobCardsService';
import invoicesService from '../services/invoicesService';
import paymentsService from '../services/paymentsService';
import estimatesService from '../services/estimatesService';
import productsService from '../services/productsService';
import reviewsService from '../services/reviewsService';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const asList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);
const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
];

function getDateRange(preset, customStart, customEnd) {
  const now = dayjs();
  switch (preset) {
    case 'today':
      return [now.startOf('day'), now.endOf('day')];
    case 'yesterday': {
      const y = now.subtract(1, 'day');
      return [y.startOf('day'), y.endOf('day')];
    }
    case 'week':
      return [now.startOf('week'), now.endOf('week')];
    case 'lastMonth': {
      const m = now.subtract(1, 'month');
      return [m.startOf('month'), m.endOf('month')];
    }
    case 'year':
      return [now.startOf('year'), now.endOf('year')];
    case 'custom':
      return [
        customStart ? dayjs(customStart).startOf('day') : now.startOf('month'),
        customEnd ? dayjs(customEnd).endOf('day') : now.endOf('day'),
      ];
    case 'month':
    default:
      return [now.startOf('month'), now.endOf('month')];
  }
}

const inRange = (dateStr, start, end) => {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  return t >= start.valueOf() && t <= end.valueOf();
};

const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

function StatCard({ icon: Icon, label, value, to, color, bgColor, small }) {
  const content = (
    <div style={{
      background: '#fff', borderRadius: 14, padding: small ? '14px 16px' : '18px 20px', border: '1px solid #e2e8f0',
      boxShadow: '0 2px 12px rgba(37,99,235,0.06)', display: 'flex', alignItems: 'center', gap: 14,
      height: '100%',
    }}>
      <div style={{
        width: small ? 38 : 46, height: small ? 38 : 46, borderRadius: 12, background: bgColor || 'rgba(37,99,235,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={small ? 16 : 20} color={color || '#2563eb'} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
        {/* overflowWrap lets a wide, unbroken value ("₹40,000" has no space to wrap at) break
            onto a second line instead of spilling past the card's edge — cramped cards like the
            Card/UPI half-width ones are the ones that actually hit this. */}
        <div style={{ fontSize: small ? 18 : 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.1, overflowWrap: 'break-word' }}>{value}</div>
      </div>
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>{content}</Link> : content;
}

export default function SuperAdminDashboard() {
  const [state, setState] = useState({
    loading: true, error: null, jobCards: [], invoices: [], payments: [], estimates: [], products: [], reviews: [],
  });
  const [preset, setPreset] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      jobCardsService.getAll(),
      invoicesService.getAll(),
      paymentsService.getAll(),
      estimatesService.getAll(),
      productsService.getAll({ itemType: 'PRODUCT' }),
      reviewsService.getAll(),
    ])
      .then(([jobCards, invoices, payments, estimates, products, reviews]) => {
        if (cancelled) return;
        setState({
          loading: false, error: null,
          jobCards: asList(jobCards), invoices: asList(invoices), payments: asList(payments),
          estimates: asList(estimates), products: asList(products), reviews: asList(reviews),
        });
      })
      .catch((error) => { if (!cancelled) setState((s) => ({ ...s, loading: false, error })); });
    return () => { cancelled = true; };
  }, []);

  const { jobCards, invoices, payments, estimates, products, reviews } = state;

  const [rangeStart, rangeEnd] = useMemo(() => getDateRange(preset, customStart, customEnd), [preset, customStart, customEnd]);

  const matchesVehicle = (category) => vehicleFilter === 'ALL' || category === vehicleFilter;

  // Lookups for joining vehicleCategory onto records that don't carry it directly
  // (estimates/reviews only have jobCardId; payments only have invoiceId).
  const jobCardById = useMemo(() => new Map(jobCards.map((j) => [j.jobCardId, j])), [jobCards]);
  const invoiceById = useMemo(() => new Map(invoices.map((i) => [i.invoiceId, i])), [invoices]);

  // ---- Fixed, always-on revenue anchors — not affected by the filter bar below ----
  const fixedRevenue = useMemo(() => {
    const live = invoices.filter((i) => i.status !== 'CANCELLED');
    const now = dayjs();
    const todaysRevenue = live.filter((i) => isToday(i.invoiceDate || i.createdAt)).reduce((s, i) => s + Number(i.grandTotal || 0), 0);
    const monthlyRevenue = live
      .filter((i) => dayjs(i.invoiceDate || i.createdAt).isSame(now, 'month'))
      .reduce((s, i) => s + Number(i.grandTotal || 0), 0);
    const totalRevenue = live.reduce((s, i) => s + Number(i.grandTotal || 0), 0);
    return { todaysRevenue, monthlyRevenue, totalRevenue };
  }, [invoices]);

  // ---- Everything below respects the date-range + Car/Bike filter ----
  const filteredInvoices = useMemo(
    () => invoices.filter((i) =>
      i.status !== 'CANCELLED' && inRange(i.invoiceDate || i.createdAt, rangeStart, rangeEnd) && matchesVehicle(i.vehicleCategory)
    ),
    [invoices, rangeStart, rangeEnd, vehicleFilter] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const revenue = useMemo(() => {
    const outstanding = filteredInvoices.reduce((s, i) => s + Number(i.balanceAmount || 0), 0);
    const serviceRevenue = filteredInvoices.reduce((s, i) => s + Number(i.serviceSubtotal || 0), 0);
    const partsRevenue = filteredInvoices.reduce((s, i) => s + Number(i.productSubtotal || 0), 0);
    const carRevenue = filteredInvoices.filter((i) => i.vehicleCategory === 'CAR').reduce((s, i) => s + Number(i.grandTotal || 0), 0);
    const bikeRevenue = filteredInvoices.filter((i) => i.vehicleCategory === 'BIKE').reduce((s, i) => s + Number(i.grandTotal || 0), 0);
    const total = filteredInvoices.reduce((s, i) => s + Number(i.grandTotal || 0), 0);
    return { outstanding, serviceRevenue, partsRevenue, carRevenue, bikeRevenue, total };
  }, [filteredInvoices]);

  const paymentMix = useMemo(() => {
    const filtered = payments.filter((p) =>
      inRange(p.paymentDate, rangeStart, rangeEnd) && matchesVehicle(invoiceById.get(p.invoiceId)?.vehicleCategory)
    );
    const byMethod = (m) => filtered.filter((p) => p.paymentMethod === m).reduce((s, p) => s + Number(p.amount || 0), 0);
    return { cash: byMethod('CASH'), upi: byMethod('UPI'), card: byMethod('CARD') };
  }, [payments, rangeStart, rangeEnd, vehicleFilter, invoiceById]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredJobCards = useMemo(
    () => jobCards.filter((j) => inRange(j.dateIn || j.createdAt, rangeStart, rangeEnd) && matchesVehicle(j.vehicleCategory)),
    [jobCards, rangeStart, rangeEnd, vehicleFilter] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const jobStats = useMemo(() => ({
    total: filteredJobCards.length,
    inProgress: filteredJobCards.filter((j) => j.status === 'IN_PROGRESS').length,
    readyForDelivery: filteredJobCards.filter((j) => j.status === 'READY_FOR_DELIVERY').length,
  }), [filteredJobCards]);

  const customerStats = useMemo(() => {
    const allTimeCounts = new Map();
    jobCards.forEach((j) => allTimeCounts.set(j.customerId, (allTimeCounts.get(j.customerId) || 0) + 1));
    const activeIds = new Set(filteredJobCards.map((j) => j.customerId));
    const returning = [...activeIds].filter((id) => (allTimeCounts.get(id) || 0) >= 2).length;
    return { total: activeIds.size, returning };
  }, [jobCards, filteredJobCards]);

  const filteredEstimates = useMemo(
    () => estimates.filter((e) =>
      inRange(e.createdAt, rangeStart, rangeEnd) && matchesVehicle(jobCardById.get(e.jobCardId)?.vehicleCategory)
    ),
    [estimates, rangeStart, rangeEnd, vehicleFilter, jobCardById] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const estimateStats = useMemo(() => ({
    pending: filteredEstimates.filter((e) => e.status === 'PENDING').length,
    approved: filteredEstimates.filter((e) => e.status === 'APPROVED').length,
    rejected: filteredEstimates.filter((e) => e.status === 'REJECTED').length,
    changesRequested: filteredEstimates.filter((e) => e.status === 'CHANGES_REQUESTED').length,
  }), [filteredEstimates]);

  const lowStock = useMemo(
    () => products.filter((p) => Number(p.stockQuantity) <= Number(p.minimumStock) && matchesVehicle(p.vehicleType)),
    [products, vehicleFilter] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const topLists = useMemo(() => {
    const services = new Map();
    const productsMap = new Map();
    filteredInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const target = item.itemType === 'SERVICE' ? services : item.itemType === 'PRODUCT' ? productsMap : null;
        if (!target) return;
        const key = item.itemName || 'Unknown';
        const existing = target.get(key) || { name: key, revenue: 0, qty: 0 };
        existing.revenue += Number(item.totalAmount || 0);
        existing.qty += Number(item.quantity || 0);
        target.set(key, existing);
      });
    });
    const top = (map) => [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    return { topServices: top(services), topProducts: top(productsMap) };
  }, [filteredInvoices]);

  const technicianPerformance = useMemo(() => {
    const byTech = new Map();
    filteredJobCards.forEach((j) => {
      if (!j.technicianName) return;
      const entry = byTech.get(j.technicianName) || { name: j.technicianName, jobs: 0, delivered: 0, ratingSum: 0, ratingCount: 0 };
      entry.jobs += 1;
      if (j.status === 'DELIVERED') entry.delivered += 1;
      byTech.set(j.technicianName, entry);
    });
    reviews
      .filter((r) => inRange(r.createdAt, rangeStart, rangeEnd) && matchesVehicle(jobCardById.get(r.jobCardId)?.vehicleCategory))
      .forEach((r) => {
        const techName = jobCardById.get(r.jobCardId)?.technicianName;
        if (!techName) return;
        const entry = byTech.get(techName);
        if (!entry) return;
        entry.ratingSum += Number(r.rating || 0);
        entry.ratingCount += 1;
      });
    return [...byTech.values()]
      .map((t) => ({ ...t, avgRating: t.ratingCount > 0 ? t.ratingSum / t.ratingCount : null }))
      .sort((a, b) => b.jobs - a.jobs);
  }, [filteredJobCards, reviews, rangeStart, rangeEnd, vehicleFilter, jobCardById]); // eslint-disable-line react-hooks/exhaustive-deps

  const ratingStats = useMemo(() => {
    const filtered = reviews.filter((r) =>
      inRange(r.createdAt, rangeStart, rangeEnd) && matchesVehicle(jobCardById.get(r.jobCardId)?.vehicleCategory)
    );
    const total = filtered.length;
    const sum = filtered.reduce((s, r) => s + Number(r.rating || 0), 0);
    return { total, average: total > 0 ? sum / total : 0 };
  }, [reviews, rangeStart, rangeEnd, vehicleFilter, jobCardById]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading) return <Loader label="Loading dashboard..." />;
  if (state.error) return <ErrorPage message="Could not load dashboard data from the backend." />;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h1 className="erp-page-title mb-0">Owner Dashboard</h1>
      </div>

      {/* Fixed revenue anchors — always today/this-month/all-time, independent of the filter below */}
      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-4">
          <StatCard icon={FiTrendingUp} label="Today's Revenue" value={currency(fixedRevenue.todaysRevenue)} to="/invoices" color="#2563eb" bgColor="rgba(37,99,235,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-4">
          <StatCard icon={FiTrendingUp} label="Monthly Revenue" value={currency(fixedRevenue.monthlyRevenue)} to="/invoices" color="#0ea5e9" bgColor="rgba(14,165,233,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-4">
          <StatCard icon={FiTrendingUp} label="Total Revenue (All-Time)" value={currency(fixedRevenue.totalRevenue)} to="/invoices" color="#16a34a" bgColor="rgba(22,163,74,0.1)" />
        </div>
      </div>

      {/* Filter bar — governs every card/table below this point */}
      <div className="erp-card p-3 mb-3 d-flex flex-wrap align-items-center gap-3">
        <div className="btn-group" role="group" aria-label="Date range">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`btn btn-sm ${preset === p.value ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setPreset(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="d-flex align-items-center gap-2">
            <input type="date" className="form-control form-control-sm" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <span className="text-secondary small">to</span>
            <input type="date" className="form-control form-control-sm" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        )}
        <div className="btn-group ms-auto" role="group" aria-label="Vehicle type">
          {['ALL', 'CAR', 'BIKE'].map((v) => (
            <button
              key={v}
              type="button"
              className={`btn btn-sm ${vehicleFilter === v ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setVehicleFilter(v)}
            >
              {v === 'ALL' ? 'All' : v === 'CAR' ? 'Car' : 'Bike'}
            </button>
          ))}
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiFileText} label="Revenue (Selected Period)" value={currency(revenue.total)} color="#2563eb" bgColor="rgba(37,99,235,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiAlertTriangle} label="Outstanding" value={currency(revenue.outstanding)} to="/invoices" color="#dc2626" bgColor="rgba(220,38,38,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiTool} label="Service Revenue" value={currency(revenue.serviceRevenue)} color="#0ea5e9" bgColor="rgba(14,165,233,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiPackage} label="Parts Revenue" value={currency(revenue.partsRevenue)} color="#8b5cf6" bgColor="rgba(139,92,246,0.1)" />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FaCarSide} label="Car Revenue" value={currency(revenue.carRevenue)} color="#2563eb" bgColor="rgba(37,99,235,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FaMotorcycle} label="Bike Revenue" value={currency(revenue.bikeRevenue)} color="#f59e0b" bgColor="rgba(245,158,11,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiDollarSign} label="Cash" value={currency(paymentMix.cash)} to="/payments" color="#16a34a" bgColor="rgba(22,163,74,0.1)" small />
        </div>
        <div className="col-sm-6 col-lg-3">
          {/* Stacked full-width, not side-by-side col-6/col-6 — at quarter-row width split in
              half again, a real balance like ₹63,143 had nowhere to go but wrap one digit per
              line. Full width per card gives it the same room Cash gets, just shorter. */}
          <div className="row g-2 h-100">
            <div className="col-12">
              <StatCard icon={FiCreditCard} label="Card" value={currency(paymentMix.card)} to="/payments" color="#6366f1" bgColor="rgba(99,102,241,0.1)" small />
            </div>
            <div className="col-12">
              <StatCard icon={FiCreditCard} label="UPI" value={currency(paymentMix.upi)} to="/payments" color="#0ea5e9" bgColor="rgba(14,165,233,0.1)" small />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiClipboard} label="Jobs" value={jobStats.total} to="/job-cards" color="#2563eb" bgColor="rgba(37,99,235,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiClock} label="Jobs In Progress" value={jobStats.inProgress} to="/workshop-board" color="#f59e0b" bgColor="rgba(245,158,11,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiCheckCircle} label="Ready for Delivery" value={jobStats.readyForDelivery} to="/workshop-board" color="#16a34a" bgColor="rgba(22,163,74,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiPackage} label="Low Stock Parts" value={lowStock.length} to="/stock" color="#dc2626" bgColor="rgba(220,38,38,0.1)" />
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiUserCheck} label="Customers Served" value={customerStats.total} to="/customers" color="#8b5cf6" bgColor="rgba(139,92,246,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiRepeat} label="Returning Customers" value={customerStats.returning} to="/customers" color="#0ea5e9" bgColor="rgba(14,165,233,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiStar} label="Average Rating" value={ratingStats.total > 0 ? `${ratingStats.average.toFixed(1)} / 5` : '—'} to="/reviews" color="#f59e0b" bgColor="rgba(245,158,11,0.1)" />
        </div>
        <div className="col-sm-6 col-lg-3">
          <StatCard icon={FiStar} label="Reviews" value={ratingStats.total} to="/reviews" color="#8b5cf6" bgColor="rgba(139,92,246,0.1)" />
        </div>
      </div>

      <div className="erp-card p-3 mb-3">
        <h6 className="mb-3">Estimates (Selected Period)</h6>
        <div className="d-flex flex-wrap gap-2">
          <span className="badge bg-warning text-dark">Pending: {estimateStats.pending}</span>
          <span className="badge bg-success">Approved: {estimateStats.approved}</span>
          <span className="badge bg-danger">Rejected: {estimateStats.rejected}</span>
          {estimateStats.changesRequested > 0 && <span className="badge bg-info text-dark">Changes Requested: {estimateStats.changesRequested}</span>}
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-6">
          <div className="erp-card p-3">
            <h6 className="mb-3">Top Services</h6>
            {topLists.topServices.length === 0 ? (
              <p className="text-secondary small mb-0">No service revenue in this period.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead><tr><th>Service</th><th>Qty</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {topLists.topServices.map((s) => (
                      <tr key={s.name}><td>{s.name}</td><td>{s.qty}</td><td>{currency(s.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="col-lg-6">
          <div className="erp-card p-3">
            <h6 className="mb-3">Top Products</h6>
            {topLists.topProducts.length === 0 ? (
              <p className="text-secondary small mb-0">No product revenue in this period.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {topLists.topProducts.map((p) => (
                      <tr key={p.name}><td>{p.name}</td><td>{p.qty}</td><td>{currency(p.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="erp-card p-3">
        <h6 className="mb-3 d-flex align-items-center gap-2"><FiAward /> Technician Performance</h6>
        {technicianPerformance.length === 0 ? (
          <p className="text-secondary small mb-0">No jobs assigned to a technician in this period.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead><tr><th>Technician</th><th>Jobs</th><th>Delivered</th><th>Avg Rating</th></tr></thead>
              <tbody>
                {technicianPerformance.map((t) => (
                  <tr key={t.name}>
                    <td className="fw-semibold">{t.name}</td>
                    <td>{t.jobs}</td>
                    <td>{t.delivered}</td>
                    <td>{t.avgRating != null ? `${t.avgRating.toFixed(1)} / 5` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
