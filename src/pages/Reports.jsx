import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  FiTrendingUp, FiDollarSign, FiAlertTriangle, FiTool, FiPackage, FiFileText, FiCreditCard,
  FiClipboard, FiUserCheck, FiRepeat, FiCheckCircle, FiXCircle, FiStar, FiGift, FiAward, FiPercent,
} from 'react-icons/fi';
import { FaCarSide, FaMotorcycle } from 'react-icons/fa';
import jobCardsService from '../services/jobCardsService';
import invoicesService from '../services/invoicesService';
import paymentsService from '../services/paymentsService';
import estimatesService from '../services/estimatesService';
import additionalWorkService from '../services/additionalWorkService';
import productsService from '../services/productsService';
import stockMovementsService from '../services/stockMovementsService';
import reviewsService from '../services/reviewsService';
import offersService from '../services/offersService';
import categoriesService from '../services/categoriesService';
import vehiclesService from '../services/vehiclesService';
import customersService from '../services/customersService';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';
import { DASHBOARD_TONES as T } from '../utils/dashboardTheme';
import EmptyState from '../components/EmptyState';

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

const TABS = [
  { key: 'revenue', label: 'Revenue', icon: FiTrendingUp },
  { key: 'customers', label: 'Customers & Vehicles', icon: FiUserCheck },
  { key: 'jobcards', label: 'Job Cards', icon: FiClipboard },
  { key: 'estimates', label: 'Estimates', icon: FiFileText },
  { key: 'additionalwork', label: 'Additional Work', icon: FiTool },
  { key: 'payments', label: 'Payments & Outstanding', icon: FiCreditCard },
  { key: 'tax', label: 'GST / Tax', icon: FiPercent },
  { key: 'parts', label: 'Parts Usage & Stock', icon: FiPackage },
  { key: 'technicians', label: 'Technician Performance', icon: FiAward },
  { key: 'reviews', label: 'Reviews', icon: FiStar },
  { key: 'offers', label: 'Offers', icon: FiGift },
];

function StatCard({ icon: Icon, label, value, color, bgColor }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '16px 18px', border: '1px solid #e2e8f0',
      boxShadow: '0 1px 2px rgba(23,20,18,0.04), 0 4px 12px rgba(23,20,18,0.05)', display: 'flex', alignItems: 'center', gap: 14, height: '100%',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, background: bgColor || T.brand.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} color={color || T.brand.color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1.1, overflowWrap: 'break-word' }}>{value}</div>
      </div>
    </div>
  );
}

const Row = ({ children }) => <div className="row g-3 mb-3">{children}</div>;
const Col = ({ children }) => <div className="col-sm-6 col-lg-3">{children}</div>;

export default function Reports() {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [tab, setTab] = useState('revenue');
  const [preset, setPreset] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      jobCardsService.getAll(),
      invoicesService.getAll(),
      paymentsService.getAll(),
      estimatesService.getAll(),
      additionalWorkService.getAll(),
      productsService.getAll({ itemType: 'PRODUCT' }),
      stockMovementsService.getAll(),
      reviewsService.getAll(),
      offersService.getAll(),
      categoriesService.getAll(),
      vehiclesService.getAll(),
      customersService.getAll(),
    ])
      .then(([jobCards, invoices, payments, estimates, additionalWork, products, movements, reviews, offers, categories, vehicles, customers]) => {
        if (cancelled) return;
        setState({
          loading: false, error: null,
          data: {
            jobCards: asList(jobCards), invoices: asList(invoices), payments: asList(payments),
            estimates: asList(estimates), additionalWork: asList(additionalWork), products: asList(products),
            movements: asList(movements), reviews: asList(reviews), offers: asList(offers),
            categories: asList(categories), vehicles: asList(vehicles), customers: asList(customers),
          },
        });
      })
      .catch((error) => { if (!cancelled) setState((s) => ({ ...s, loading: false, error })); });
    return () => { cancelled = true; };
  }, []);

  const [rangeStart, rangeEnd] = useMemo(() => getDateRange(preset, customStart, customEnd), [preset, customStart, customEnd]);
  const matchesVehicle = (category) => vehicleFilter === 'ALL' || category === vehicleFilter;

  const d = state.data;

  const jobCardById = useMemo(() => new Map((d?.jobCards || []).map((j) => [j.jobCardId, j])), [d]);
  const invoiceById = useMemo(() => new Map((d?.invoices || []).map((i) => [i.invoiceId, i])), [d]);
  const productById = useMemo(() => new Map((d?.products || []).map((p) => [p.productId, p])), [d]);

  const filteredInvoices = useMemo(() => {
    if (!d) return [];
    return d.invoices.filter((i) =>
      i.status !== 'CANCELLED' && inRange(i.invoiceDate || i.createdAt, rangeStart, rangeEnd) && matchesVehicle(i.vehicleCategory)
    );
  }, [d, rangeStart, rangeEnd, vehicleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredJobCards = useMemo(() => {
    if (!d) return [];
    return d.jobCards.filter((j) => inRange(j.dateIn || j.createdAt, rangeStart, rangeEnd) && matchesVehicle(j.vehicleCategory));
  }, [d, rangeStart, rangeEnd, vehicleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Revenue tab ----
  const revenue = useMemo(() => {
    const total = filteredInvoices.reduce((s, i) => s + Number(i.grandTotal || 0), 0);
    const serviceRevenue = filteredInvoices.reduce((s, i) => s + Number(i.serviceSubtotal || 0), 0);
    const partsRevenue = filteredInvoices.reduce((s, i) => s + Number(i.productSubtotal || 0), 0);
    const carRevenue = filteredInvoices.filter((i) => i.vehicleCategory === 'CAR').reduce((s, i) => s + Number(i.grandTotal || 0), 0);
    const bikeRevenue = filteredInvoices.filter((i) => i.vehicleCategory === 'BIKE').reduce((s, i) => s + Number(i.grandTotal || 0), 0);

    const byDay = new Map();
    const byMonth = new Map();
    filteredInvoices.forEach((i) => {
      const date = dayjs(i.invoiceDate || i.createdAt);
      const dayKey = date.format('DD MMM YYYY');
      const monthKey = date.format('MMM YYYY');
      byDay.set(dayKey, (byDay.get(dayKey) || 0) + Number(i.grandTotal || 0));
      byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + Number(i.grandTotal || 0));
    });
    const dailySales = [...byDay.entries()].map(([date, amount]) => ({ date, amount })).sort((a, b) => dayjs(a.date, 'DD MMM YYYY') - dayjs(b.date, 'DD MMM YYYY'));
    const monthlySales = [...byMonth.entries()].map(([month, amount]) => ({ month, amount })).sort((a, b) => dayjs(a.month, 'MMM YYYY') - dayjs(b.month, 'MMM YYYY'));

    return { total, serviceRevenue, partsRevenue, carRevenue, bikeRevenue, dailySales, monthlySales };
  }, [filteredInvoices]);

  // ---- Customers & Vehicles tab ----
  const customersVehicles = useMemo(() => {
    if (!d) return { total: 0, returning: 0, newCount: 0, vehiclesServiced: 0, carCount: 0, bikeCount: 0, totalVehicles: 0 };
    const allTimeCounts = new Map();
    d.jobCards.forEach((j) => allTimeCounts.set(j.customerId, (allTimeCounts.get(j.customerId) || 0) + 1));
    const activeIds = new Set(filteredJobCards.map((j) => j.customerId));
    const returning = [...activeIds].filter((id) => (allTimeCounts.get(id) || 0) >= 2).length;

    const newCount = d.customers.filter((c) => inRange(c.createdAt, rangeStart, rangeEnd)).length;

    const vehicleIds = new Set(filteredJobCards.map((j) => j.vehicleId));
    const carVehicles = d.vehicles.filter((v) => v.vehicleCategory === 'CAR').length;
    const bikeVehicles = d.vehicles.filter((v) => v.vehicleCategory === 'BIKE').length;

    return { total: activeIds.size, returning, newCount, vehiclesServiced: vehicleIds.size, carCount: carVehicles, bikeCount: bikeVehicles, totalVehicles: d.vehicles.length };
  }, [d, filteredJobCards, rangeStart, rangeEnd]);

  // ---- Job Cards tab ----
  const jobCardStats = useMemo(() => {
    const byStatus = new Map();
    filteredJobCards.forEach((j) => byStatus.set(j.status, (byStatus.get(j.status) || 0) + 1));
    return { total: filteredJobCards.length, byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count) };
  }, [filteredJobCards]);

  // ---- Estimates tab ----
  const filteredEstimates = useMemo(() => {
    if (!d) return [];
    return d.estimates.filter((e) => inRange(e.createdAt, rangeStart, rangeEnd) && matchesVehicle(jobCardById.get(e.jobCardId)?.vehicleCategory));
  }, [d, rangeStart, rangeEnd, vehicleFilter, jobCardById]); // eslint-disable-line react-hooks/exhaustive-deps

  const estimateStats = useMemo(() => {
    const pending = filteredEstimates.filter((e) => e.status === 'PENDING').length;
    const approved = filteredEstimates.filter((e) => e.status === 'APPROVED').length;
    const rejected = filteredEstimates.filter((e) => e.status === 'REJECTED');
    const changesRequested = filteredEstimates.filter((e) => e.status === 'CHANGES_REQUESTED').length;
    const decided = approved + rejected.length;
    const conversionRate = decided > 0 ? (approved / decided) * 100 : 0;
    return { pending, approved, rejected, changesRequested, conversionRate };
  }, [filteredEstimates]);

  // ---- Additional Work tab ----
  const filteredAdditionalWork = useMemo(() => {
    if (!d) return [];
    return d.additionalWork.filter((a) => inRange(a.requestedAt, rangeStart, rangeEnd) && matchesVehicle(jobCardById.get(a.jobCardId)?.vehicleCategory));
  }, [d, rangeStart, rangeEnd, vehicleFilter, jobCardById]); // eslint-disable-line react-hooks/exhaustive-deps

  const additionalWorkStats = useMemo(() => {
    const pending = filteredAdditionalWork.filter((a) => a.status === 'PENDING');
    const approved = filteredAdditionalWork.filter((a) => a.status === 'APPROVED');
    const rejected = filteredAdditionalWork.filter((a) => a.status === 'REJECTED');
    const approvedValue = approved.reduce((s, a) => s + Number(a.grandTotal || 0), 0);
    return { pending: pending.length, approved: approved.length, rejected: rejected.length, approvedValue };
  }, [filteredAdditionalWork]);

  // ---- Payments & Outstanding tab ----
  const paymentStats = useMemo(() => {
    if (!d) return { cash: 0, upi: 0, card: 0, outstanding: 0, outstandingList: [] };
    const filteredPayments = d.payments.filter((p) =>
      inRange(p.paymentDate, rangeStart, rangeEnd) && matchesVehicle(invoiceById.get(p.invoiceId)?.vehicleCategory)
    );
    const byMethod = (m) => filteredPayments.filter((p) => p.paymentMethod === m).reduce((s, p) => s + Number(p.amount || 0), 0);
    const outstandingList = filteredInvoices.filter((i) => Number(i.balanceAmount || 0) > 0).sort((a, b) => Number(b.balanceAmount) - Number(a.balanceAmount));
    const outstanding = outstandingList.reduce((s, i) => s + Number(i.balanceAmount || 0), 0);
    return { cash: byMethod('CASH'), upi: byMethod('UPI'), card: byMethod('CARD'), outstanding, outstandingList };
  }, [d, rangeStart, rangeEnd, vehicleFilter, invoiceById, filteredInvoices]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- GST / Tax tab ----
  const taxStats = useMemo(() => ({
    totalTax: filteredInvoices.reduce((s, i) => s + Number(i.taxAmount || 0), 0),
    cgst: filteredInvoices.reduce((s, i) => s + Number(i.cgstAmount || 0), 0),
    sgst: filteredInvoices.reduce((s, i) => s + Number(i.sgstAmount || 0), 0),
    taxableValue: filteredInvoices.reduce((s, i) => s + Number(i.subtotal || 0), 0),
  }), [filteredInvoices]);

  // ---- Parts Usage & Stock tab ----
  const categoryMatches = (categoryId) => categoryFilter === 'ALL' || String(categoryId) === String(categoryFilter);

  const partsUsage = useMemo(() => {
    if (!d) return { topParts: [], totalQtyUsed: 0 };
    const saleOut = d.movements.filter((m) => {
      if (m.movementType !== 'SALE_OUT') return false;
      if (!inRange(m.createdAt, rangeStart, rangeEnd)) return false;
      const product = productById.get(m.productId);
      if (!categoryMatches(product?.categoryId)) return false;
      const invoice = invoiceById.get(m.referenceId);
      return matchesVehicle(invoice?.vehicleCategory);
    });
    const byProduct = new Map();
    saleOut.forEach((m) => {
      const existing = byProduct.get(m.productName) || { name: m.productName, qty: 0 };
      existing.qty += Number(m.quantity || 0);
      byProduct.set(m.productName, existing);
    });
    const topParts = [...byProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);
    return { topParts, totalQtyUsed: saleOut.reduce((s, m) => s + Number(m.quantity || 0), 0) };
  }, [d, rangeStart, rangeEnd, vehicleFilter, categoryFilter, productById, invoiceById]); // eslint-disable-line react-hooks/exhaustive-deps

  const stockStats = useMemo(() => {
    if (!d) return { list: [], lowStock: 0, outOfStock: 0 };
    const list = d.products.filter((p) => categoryMatches(p.categoryId));
    const lowStock = list.filter((p) => Number(p.stockQuantity) > 0 && Number(p.stockQuantity) <= Number(p.minimumStock));
    const outOfStock = list.filter((p) => Number(p.stockQuantity) <= 0);
    return { list, lowStock: lowStock.length, outOfStock: outOfStock.length };
  }, [d, categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Technician Performance tab ----
  const technicianPerformance = useMemo(() => {
    if (!d) return [];
    const byTech = new Map();
    filteredJobCards.forEach((j) => {
      if (!j.technicianName) return;
      const entry = byTech.get(j.technicianName) || { name: j.technicianName, jobs: 0, delivered: 0, ratingSum: 0, ratingCount: 0 };
      entry.jobs += 1;
      if (j.status === 'DELIVERED') entry.delivered += 1;
      byTech.set(j.technicianName, entry);
    });
    d.reviews
      .filter((r) => inRange(r.createdAt, rangeStart, rangeEnd) && matchesVehicle(jobCardById.get(r.jobCardId)?.vehicleCategory))
      .forEach((r) => {
        const techName = jobCardById.get(r.jobCardId)?.technicianName;
        const entry = techName && byTech.get(techName);
        if (!entry) return;
        entry.ratingSum += Number(r.rating || 0);
        entry.ratingCount += 1;
      });
    return [...byTech.values()]
      .map((t) => ({ ...t, avgRating: t.ratingCount > 0 ? t.ratingSum / t.ratingCount : null }))
      .sort((a, b) => b.jobs - a.jobs);
  }, [d, filteredJobCards, rangeStart, rangeEnd, vehicleFilter, jobCardById]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Reviews tab ----
  const reviewStats = useMemo(() => {
    if (!d) return { total: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    const filtered = d.reviews.filter((r) => inRange(r.createdAt, rangeStart, rangeEnd) && matchesVehicle(jobCardById.get(r.jobCardId)?.vehicleCategory));
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    filtered.forEach((r) => {
      const n = Number(r.rating);
      if (n >= 1 && n <= 5) { distribution[n] += 1; sum += n; }
    });
    return { total: filtered.length, average: filtered.length > 0 ? sum / filtered.length : 0, distribution };
  }, [d, rangeStart, rangeEnd, vehicleFilter, jobCardById]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Offers tab ----
  const offerStats = useMemo(() => {
    if (!d) return { running: 0, scheduled: 0, expired: 0, inactive: 0, list: [] };
    const today = dayjs();
    const list = d.offers.map((o) => {
      let state = 'Inactive';
      if (o.status === 'ACTIVE') {
        if (o.endDate && dayjs(o.endDate).isBefore(today, 'day')) state = 'Expired';
        else if (o.startDate && dayjs(o.startDate).isAfter(today, 'day')) state = 'Scheduled';
        else state = 'Running';
      }
      return { ...o, computedState: state };
    });
    return {
      running: list.filter((o) => o.computedState === 'Running').length,
      scheduled: list.filter((o) => o.computedState === 'Scheduled').length,
      expired: list.filter((o) => o.computedState === 'Expired').length,
      inactive: list.filter((o) => o.computedState === 'Inactive').length,
      list,
    };
  }, [d]);

  if (state.loading) return <Loader label="Building reports..." />;
  if (state.error) return <ErrorPage message="Could not load report data from the backend." />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Reports</h1>
      </div>

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
        {tab === 'parts' && (
          <select className="form-select form-select-sm" style={{ maxWidth: 200 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">All Categories</option>
            {d.categories.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>)}
          </select>
        )}
      </div>

      <ul className="nav nav-tabs mb-3 flex-nowrap overflow-auto">
        {TABS.map((t) => (
          <li className="nav-item" key={t.key}>
            <button
              className={`nav-link d-flex align-items-center gap-1 text-nowrap ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={14} /> {t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'revenue' && (
        <>
          <Row>
            <Col><StatCard icon={FiTrendingUp} label="Total Revenue" value={currency(revenue.total)} color={T.brand.color} bgColor={T.brand.bg} /></Col>
            <Col><StatCard icon={FiTool} label="Service Revenue" value={currency(revenue.serviceRevenue)} color={T.brand.color} bgColor={T.brand.bg} /></Col>
            <Col><StatCard icon={FiPackage} label="Parts Revenue" value={currency(revenue.partsRevenue)} color={T.brand.color} bgColor={T.brand.bg} /></Col>
            <Col><StatCard icon={FaCarSide} label="Car Revenue" value={currency(revenue.carRevenue)} color={T.brand.color} bgColor={T.brand.bg} /></Col>
          </Row>
          <Row>
            <Col><StatCard icon={FaMotorcycle} label="Bike Revenue" value={currency(revenue.bikeRevenue)} color={T.warning.color} bgColor={T.warning.bg} /></Col>
          </Row>
          <div className="row g-3">
            <div className="col-lg-6">
              <div className="erp-card p-3">
                <h6 className="mb-3">Daily Sales</h6>
                {revenue.dailySales.length === 0 ? <EmptyState title="No sales" message="No invoices in this period." /> : (
                  <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
                    <table className="table table-sm mb-0"><thead><tr><th>Date</th><th>Amount</th></tr></thead>
                      <tbody>{revenue.dailySales.map((r) => <tr key={r.date}><td>{r.date}</td><td>{currency(r.amount)}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="col-lg-6">
              <div className="erp-card p-3">
                <h6 className="mb-3">Monthly Sales</h6>
                {revenue.monthlySales.length === 0 ? <EmptyState title="No sales" message="No invoices in this period." /> : (
                  <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
                    <table className="table table-sm mb-0"><thead><tr><th>Month</th><th>Amount</th></tr></thead>
                      <tbody>{revenue.monthlySales.map((r) => <tr key={r.month}><td>{r.month}</td><td>{currency(r.amount)}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'customers' && (
        <Row>
          <Col><StatCard icon={FiUserCheck} label="Customers Served" value={customersVehicles.total} color={T.neutral.color} bgColor={T.neutral.bg} /></Col>
          <Col><StatCard icon={FiRepeat} label="Returning Customers" value={customersVehicles.returning} color={T.neutral.color} bgColor={T.neutral.bg} /></Col>
          <Col><StatCard icon={FiUserCheck} label="New Customers" value={customersVehicles.newCount} color={T.success.color} bgColor={T.success.bg} /></Col>
          <Col><StatCard icon={FaCarSide} label="Vehicles Serviced" value={customersVehicles.vehiclesServiced} color={T.brand.color} bgColor={T.brand.bg} /></Col>
          <Col><StatCard icon={FaCarSide} label="Total Cars Registered" value={customersVehicles.carCount} color={T.brand.color} bgColor={T.brand.bg} /></Col>
          <Col><StatCard icon={FaMotorcycle} label="Total Bikes Registered" value={customersVehicles.bikeCount} color={T.warning.color} bgColor={T.warning.bg} /></Col>
        </Row>
      )}

      {tab === 'jobcards' && (
        <div className="erp-card p-3">
          <h6 className="mb-3">Job Cards by Status ({jobCardStats.total} total in period)</h6>
          {jobCardStats.byStatus.length === 0 ? <EmptyState title="No job cards" message="No job cards in this period." /> : (
            <div className="d-flex flex-wrap gap-2">
              {jobCardStats.byStatus.map((s) => <span key={s.status} className="badge bg-secondary" style={{ fontSize: '0.85rem' }}>{s.status}: {s.count}</span>)}
            </div>
          )}
        </div>
      )}

      {tab === 'estimates' && (
        <>
          <Row>
            <Col><StatCard icon={FiFileText} label="Pending" value={estimateStats.pending} color={T.warning.color} bgColor={T.warning.bg} /></Col>
            <Col><StatCard icon={FiCheckCircle} label="Approved" value={estimateStats.approved} color={T.success.color} bgColor={T.success.bg} /></Col>
            <Col><StatCard icon={FiXCircle} label="Rejected" value={estimateStats.rejected.length} color={T.danger.color} bgColor={T.danger.bg} /></Col>
            <Col><StatCard icon={FiPercent} label="Conversion Rate" value={`${estimateStats.conversionRate.toFixed(0)}%`} color={T.brand.color} bgColor={T.brand.bg} /></Col>
          </Row>
          <div className="erp-card p-3">
            <h6 className="mb-3">Rejected Estimates</h6>
            {estimateStats.rejected.length === 0 ? <EmptyState title="No rejections" message="No estimates were rejected in this period." /> : (
              <div className="table-responsive">
                <table className="table table-sm mb-0"><thead><tr><th>Estimate #</th><th>Customer</th><th>Amount</th></tr></thead>
                  <tbody>{estimateStats.rejected.map((e) => <tr key={e.estimateId}><td>{e.estimateNumber}</td><td>{e.customerName}</td><td>{currency(e.grandTotal)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'additionalwork' && (
        <Row>
          <Col><StatCard icon={FiFileText} label="Pending" value={additionalWorkStats.pending} color={T.warning.color} bgColor={T.warning.bg} /></Col>
          <Col><StatCard icon={FiCheckCircle} label="Approved" value={additionalWorkStats.approved} color={T.success.color} bgColor={T.success.bg} /></Col>
          <Col><StatCard icon={FiXCircle} label="Rejected" value={additionalWorkStats.rejected} color={T.danger.color} bgColor={T.danger.bg} /></Col>
          <Col><StatCard icon={FiDollarSign} label="Approved Value" value={currency(additionalWorkStats.approvedValue)} color={T.brand.color} bgColor={T.brand.bg} /></Col>
        </Row>
      )}

      {tab === 'payments' && (
        <>
          <Row>
            <Col><StatCard icon={FiDollarSign} label="Cash" value={currency(paymentStats.cash)} color={T.success.color} bgColor={T.success.bg} /></Col>
            <Col><StatCard icon={FiCreditCard} label="Card" value={currency(paymentStats.card)} color={T.success.color} bgColor={T.success.bg} /></Col>
            <Col><StatCard icon={FiCreditCard} label="UPI" value={currency(paymentStats.upi)} color={T.success.color} bgColor={T.success.bg} /></Col>
            <Col><StatCard icon={FiAlertTriangle} label="Outstanding" value={currency(paymentStats.outstanding)} color={T.danger.color} bgColor={T.danger.bg} /></Col>
          </Row>
          <div className="erp-card p-3">
            <h6 className="mb-3">Outstanding Invoices</h6>
            {paymentStats.outstandingList.length === 0 ? <EmptyState title="Nothing outstanding" message="No unpaid balance in this period." /> : (
              <div className="table-responsive" style={{ maxHeight: 360, overflowY: 'auto' }}>
                <table className="table table-sm mb-0"><thead><tr><th>Invoice #</th><th>Customer</th><th>Balance</th></tr></thead>
                  <tbody>{paymentStats.outstandingList.map((i) => <tr key={i.invoiceId}><td>{i.invoiceNumber}</td><td>{i.customerName}</td><td>{currency(i.balanceAmount)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'tax' && (
        <Row>
          <Col><StatCard icon={FiDollarSign} label="Taxable Value" value={currency(taxStats.taxableValue)} color={T.brand.color} bgColor={T.brand.bg} /></Col>
          <Col><StatCard icon={FiPercent} label="Total Tax Collected" value={currency(taxStats.totalTax)} color={T.neutral.color} bgColor={T.neutral.bg} /></Col>
          <Col><StatCard icon={FiPercent} label="CGST" value={currency(taxStats.cgst)} color={T.neutral.color} bgColor={T.neutral.bg} /></Col>
          <Col><StatCard icon={FiPercent} label="SGST" value={currency(taxStats.sgst)} color={T.neutral.color} bgColor={T.neutral.bg} /></Col>
        </Row>
      )}

      {tab === 'parts' && (
        <>
          <Row>
            <Col><StatCard icon={FiPackage} label="Parts Used (Qty)" value={partsUsage.totalQtyUsed} color={T.brand.color} bgColor={T.brand.bg} /></Col>
            <Col><StatCard icon={FiAlertTriangle} label="Low Stock" value={stockStats.lowStock} color={T.warning.color} bgColor={T.warning.bg} /></Col>
            <Col><StatCard icon={FiXCircle} label="Out of Stock" value={stockStats.outOfStock} color={T.danger.color} bgColor={T.danger.bg} /></Col>
            <Col><StatCard icon={FiPackage} label="Products Tracked" value={stockStats.list.length} color={T.neutral.color} bgColor={T.neutral.bg} /></Col>
          </Row>
          <div className="row g-3">
            <div className="col-lg-6">
              <div className="erp-card p-3">
                <h6 className="mb-3">Top Parts Used</h6>
                {partsUsage.topParts.length === 0 ? <EmptyState title="No parts used" message="No parts billed in this period." /> : (
                  <div className="table-responsive">
                    <table className="table table-sm mb-0"><thead><tr><th>Product</th><th>Qty Used</th></tr></thead>
                      <tbody>{partsUsage.topParts.map((p) => <tr key={p.name}><td>{p.name}</td><td>{p.qty}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="col-lg-6">
              <div className="erp-card p-3">
                <h6 className="mb-3">Current Stock</h6>
                <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
                  <table className="table table-sm mb-0"><thead><tr><th>Product</th><th>Stock</th><th>Min</th></tr></thead>
                    <tbody>
                      {stockStats.list.map((p) => {
                        const stock = Number(p.stockQuantity);
                        const min = Number(p.minimumStock);
                        const tone = stock <= 0 ? 'bg-danger' : stock <= min ? 'bg-warning text-dark' : 'bg-success';
                        return <tr key={p.productId}><td>{p.productName}</td><td><span className={`badge ${tone}`}>{p.stockQuantity}</span></td><td>{p.minimumStock}</td></tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'technicians' && (
        <div className="erp-card p-3">
          <h6 className="mb-3">Technician Performance</h6>
          {technicianPerformance.length === 0 ? <EmptyState title="No data" message="No jobs assigned to a technician in this period." /> : (
            <div className="table-responsive">
              <table className="table table-sm mb-0"><thead><tr><th>Technician</th><th>Jobs</th><th>Delivered</th><th>Avg Rating</th></tr></thead>
                <tbody>
                  {technicianPerformance.map((t) => (
                    <tr key={t.name}><td className="fw-semibold">{t.name}</td><td>{t.jobs}</td><td>{t.delivered}</td><td>{t.avgRating != null ? `${t.avgRating.toFixed(1)} / 5` : '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'reviews' && (
        <>
          <Row>
            <Col><StatCard icon={FiStar} label="Average Rating" value={reviewStats.total > 0 ? `${reviewStats.average.toFixed(1)} / 5` : '—'} color={T.neutral.color} bgColor={T.neutral.bg} /></Col>
            <Col><StatCard icon={FiStar} label="Total Reviews" value={reviewStats.total} color={T.neutral.color} bgColor={T.neutral.bg} /></Col>
          </Row>
          <div className="erp-card p-3">
            <h6 className="mb-3">Rating Distribution</h6>
            {reviewStats.total === 0 ? <EmptyState title="No reviews" message="No reviews in this period." /> : (
              [5, 4, 3, 2, 1].map((n) => {
                const count = reviewStats.distribution[n];
                const pct = reviewStats.total > 0 ? Math.round((count / reviewStats.total) * 100) : 0;
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
        </>
      )}

      {tab === 'offers' && (
        <>
          <Row>
            <Col><StatCard icon={FiGift} label="Running" value={offerStats.running} color={T.success.color} bgColor={T.success.bg} /></Col>
            <Col><StatCard icon={FiGift} label="Scheduled" value={offerStats.scheduled} color={T.brand.color} bgColor={T.brand.bg} /></Col>
            <Col><StatCard icon={FiGift} label="Expired" value={offerStats.expired} color={T.danger.color} bgColor={T.danger.bg} /></Col>
            <Col><StatCard icon={FiGift} label="Inactive" value={offerStats.inactive} color={T.neutral.color} bgColor={T.neutral.bg} /></Col>
          </Row>
          <div className="erp-card p-3">
            <h6 className="mb-3">Offers</h6>
            <p className="text-secondary small">
              Redemption counts aren&apos;t shown — invoices don&apos;t currently record which offer (if any) was applied,
              so there&apos;s no real data to report here without inventing it.
            </p>
            {offerStats.list.length === 0 ? <EmptyState title="No offers" message="No offers have been created yet." /> : (
              <div className="table-responsive">
                <table className="table table-sm mb-0"><thead><tr><th>Offer</th><th>Type</th><th>Vehicle</th><th>Valid</th><th>State</th></tr></thead>
                  <tbody>
                    {offerStats.list.map((o) => (
                      <tr key={o.offerId}>
                        <td>{o.offerName}</td>
                        <td>{o.discountType} {o.discountValue}</td>
                        <td>{o.vehicleType || 'All'}</td>
                        <td>{o.startDate || '—'} to {o.endDate || '—'}</td>
                        <td><span className={`badge ${o.computedState === 'Running' ? 'bg-success' : o.computedState === 'Scheduled' ? 'bg-info text-dark' : o.computedState === 'Expired' ? 'bg-danger' : 'bg-secondary'}`}>{o.computedState}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
