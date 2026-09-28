import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import visitsService, { VISIT_PURPOSES, purposeLabel } from '../services/visitsService';
import customersService from '../services/customersService';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import ConfirmDialog from '../components/ConfirmDialog';
import Loader from '../components/Loader';
import RegularBadge from '../components/RegularBadge';
import LogVisitModal from '../components/LogVisitModal';
import ErrorPage from './ErrorPage';

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

// Customer visits. SUPER_ADMIN: every visit + reports (top regular customers, visits by vehicle,
// common purposes). EMPLOYEE: the visits they logged/handled + their own summary. Both can log.
export default function Visits() {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [visits, setVisits] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState('log');
  const [search, setSearch] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('ALL');
  const [showLog, setShowLog] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoadError(false);
    visitsService.getAll().then((data) => setVisits(asList(data))).catch(() => setLoadError(true));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!visits) return [];
    const q = search.trim().toLowerCase();
    return visits.filter((v) => (purposeFilter === 'ALL' || v.purpose === purposeFilter)
      && (!q || [v.customerName, v.customerPhone, v.registrationNumber, v.vehicleModel, v.notes, v.handledByName]
        .some((s) => s?.toLowerCase().includes(q))));
  }, [visits, search, purposeFilter]);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await visitsService.remove(deleting.visitId);
      toast.success('Visit deleted');
      setDeleting(null);
      load();
    } catch {
      // toast already shown
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <ErrorPage message="Could not load visits. Check your connection and try again." onRetry={load} />;
  if (!visits) return <Loader label="Loading visits..." />;

  const columns = [
    { key: 'visitDateTime', label: 'Date', sortable: true, render: (row) => dayjs(row.visitDateTime).format('DD MMM YYYY, hh:mm A') },
    {
      key: 'customerName',
      label: 'Customer',
      render: (row) => (
        <>
          <div className="d-flex align-items-center gap-2 flex-wrap">{row.customerName} <RegularBadge status={row.customerRegularStatus} short /></div>
          <div className="small text-secondary">{row.customerPhone}</div>
        </>
      ),
    },
    { key: 'vehicle', label: 'Vehicle', render: (row) => (row.vehicleModel ? <>{row.vehicleModel}<div className="small text-secondary">{row.registrationNumber}</div></> : '—') },
    {
      key: 'purpose',
      label: 'Purpose',
      render: (row) => (
        <>
          {purposeLabel(row.purpose)}
          {row.source === 'JOB_CARD' && <div><span className="badge bg-light text-dark border">Job card</span></div>}
        </>
      ),
    },
    { key: 'notes', label: 'Notes', render: (row) => <span className="small">{row.notes || '—'}</span> },
    { key: 'handledByName', label: 'Handled By', render: (row) => row.handledByName || '—' },
    ...(isSuperAdmin ? [{
      key: 'actions',
      label: '',
      render: (row) => (row.source === 'MANUAL' ? (
        <button type="button" className="btn btn-sm btn-outline-danger" title="Delete visit" aria-label="Delete visit" onClick={(e) => { e.stopPropagation(); setDeleting(row); }}>
          <FiTrash2 size={13} />
        </button>
      ) : null),
    }] : []),
  ];

  return (
    <div>
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title">{isSuperAdmin ? 'Customer Visits' : 'My Visits'}</h1>
          <div className="text-secondary small">
            Every visit — logged here or opened as a job card — counts toward the customer&apos;s New / Occasional / Regular status.
          </div>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-1" onClick={() => setShowLog(true)}>
          <FiPlus /> Log Visit
        </button>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>Visit Log</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>Reports</button></li>
      </ul>

      {tab === 'reports' ? (
        isSuperAdmin ? <AdminVisitReports visits={visits} /> : <MyVisitSummary visits={visits} />
      ) : (
        <>
          <div className="erp-card p-3 mb-3 d-flex flex-wrap align-items-center gap-2">
            <select className="form-select form-select-sm" style={{ maxWidth: 200 }} value={purposeFilter} onChange={(e) => setPurposeFilter(e.target.value)} aria-label="Purpose">
              <option value="ALL">All purposes</option>
              {VISIT_PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <div className="ms-auto"><SearchBar value={search} onChange={setSearch} placeholder="Search customer, mobile, registration..." /></div>
          </div>
          <DataTable
            keyField="visitId"
            rows={filtered}
            columns={columns}
            onRowClick={(row) => navigate(`/customers/${row.customerId}`)}
            emptyTitle={isSuperAdmin ? 'No visits yet' : 'No visits logged by you yet'}
            emptyMessage='Click "Log Visit" when a customer comes in.'
          />
        </>
      )}

      {showLog && <LogVisitModal onClose={() => setShowLog(false)} onLogged={() => { setShowLog(false); load(); }} />}

      <ConfirmDialog
        show={Boolean(deleting)}
        title="Delete this visit?"
        message="The customer's visit count and status will be recalculated."
        isLoading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function RankList({ title, rows, render, empty }) {
  return (
    <div className="erp-card p-3 h-100">
      <h6 className="mb-3">{title}</h6>
      {rows.length === 0 ? <p className="text-secondary small mb-0">{empty}</p> : (
        <ol className="small mb-0 ps-3">
          {rows.map((r, i) => <li key={i} className="mb-2">{render(r)}</li>)}
        </ol>
      )}
    </div>
  );
}

function Bars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="d-flex flex-column gap-2">
      {rows.map((r) => (
        <div key={r.key} className="small">
          <div className="d-flex justify-content-between"><span>{r.label}</span><strong>{r.count}</strong></div>
          <div className="progress" style={{ height: 8 }} aria-label={`${r.label}: ${r.count}`}>
            <div className="progress-bar" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminVisitReports({ visits }) {
  const [customers, setCustomers] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    customersService.getAll().then((data) => setCustomers(asList(data))).catch(() => setCustomers([]));
  }, []);

  const report = useMemo(() => {
    if (!customers) return null;
    const counts = { REGULAR: 0, OCCASIONAL: 0, NEW: 0 };
    customers.forEach((c) => { counts[c.regularStatus || 'NEW'] = (counts[c.regularStatus || 'NEW'] || 0) + 1; });
    const topRegular = customers
      .filter((c) => c.regularStatus === 'REGULAR')
      .sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0))
      .slice(0, 10);
    const byVehicle = new Map();
    visits.forEach((v) => {
      if (!v.vehicleId) return;
      const e = byVehicle.get(v.vehicleId) || { vehicleModel: v.vehicleModel, registrationNumber: v.registrationNumber, customerName: v.customerName, count: 0, last: v.visitDateTime };
      e.count += 1;
      if (v.visitDateTime > e.last) e.last = v.visitDateTime;
      byVehicle.set(v.vehicleId, e);
    });
    const topVehicles = [...byVehicle.values()].sort((a, b) => b.count - a.count).slice(0, 10);
    const purposes = VISIT_PURPOSES.map((p) => ({ key: p.value, label: p.label, count: visits.filter((v) => v.purpose === p.value).length }))
      .sort((a, b) => b.count - a.count);
    const last30 = visits.filter((v) => dayjs(v.visitDateTime).isAfter(dayjs().subtract(30, 'day'))).length;
    return { counts, topRegular, topVehicles, purposes, last30 };
  }, [customers, visits]);

  if (!report) return <Loader label="Loading report..." />;

  return (
    <div>
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3"><div className="erp-stat-card"><div className="text-secondary small">⭐ Regular Customers</div><div className="erp-stat-value">{report.counts.REGULAR}</div></div></div>
        <div className="col-6 col-lg-3"><div className="erp-stat-card"><div className="text-secondary small">🕑 Occasional</div><div className="erp-stat-value">{report.counts.OCCASIONAL}</div></div></div>
        <div className="col-6 col-lg-3"><div className="erp-stat-card"><div className="text-secondary small">🆕 New</div><div className="erp-stat-value">{report.counts.NEW}</div></div></div>
        <div className="col-6 col-lg-3"><div className="erp-stat-card"><div className="text-secondary small">Visits (last 30 days)</div><div className="erp-stat-value">{report.last30}</div></div></div>
      </div>
      <div className="row g-3">
        <div className="col-lg-4">
          <RankList
            title="Top Regular Customers"
            rows={report.topRegular}
            empty="No regular customers yet."
            render={(c) => (
              <button type="button" className="btn btn-link p-0 text-start small" onClick={() => navigate(`/customers/${c.id}`)}>
                <strong>{c.customerName}</strong> <span className="text-secondary">— {c.totalVisits} visits{c.lastVisitDate ? `, last ${dayjs(c.lastVisitDate).format('DD MMM')}` : ''}</span>
              </button>
            )}
          />
        </div>
        <div className="col-lg-4">
          <RankList
            title="Visit Frequency by Vehicle"
            rows={report.topVehicles}
            empty="No visits yet."
            render={(v) => (
              <span><strong>{v.registrationNumber}</strong> {v.vehicleModel} <span className="text-secondary">— {v.count} visits · {v.customerName}</span></span>
            )}
          />
        </div>
        <div className="col-lg-4">
          <div className="erp-card p-3 h-100">
            <h6 className="mb-3">Common Visit Purposes</h6>
            <Bars rows={report.purposes} />
          </div>
        </div>
      </div>
    </div>
  );
}

// An EMPLOYEE's own numbers only — built from the visits the API already scoped to them.
function MyVisitSummary({ visits }) {
  const summary = useMemo(() => {
    const thisMonth = dayjs().format('YYYY-MM');
    const customers = new Map();
    visits.forEach((v) => {
      const e = customers.get(v.customerId) || { name: v.customerName, status: v.customerRegularStatus, count: 0 };
      e.count += 1;
      customers.set(v.customerId, e);
    });
    return {
      total: visits.length,
      month: visits.filter((v) => dayjs(v.visitDateTime).format('YYYY-MM') === thisMonth).length,
      customers: [...customers.values()].sort((a, b) => b.count - a.count),
      purposes: VISIT_PURPOSES.map((p) => ({ key: p.value, label: p.label, count: visits.filter((v) => v.purpose === p.value).length })),
    };
  }, [visits]);

  return (
    <div>
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-4"><div className="erp-stat-card"><div className="text-secondary small">Visits I Handled</div><div className="erp-stat-value">{summary.total}</div></div></div>
        <div className="col-6 col-lg-4"><div className="erp-stat-card"><div className="text-secondary small">This Month</div><div className="erp-stat-value">{summary.month}</div></div></div>
        <div className="col-6 col-lg-4"><div className="erp-stat-card"><div className="text-secondary small">Customers I Handled</div><div className="erp-stat-value">{summary.customers.length}</div></div></div>
      </div>
      <div className="row g-3">
        <div className="col-lg-7">
          <RankList
            title="Customers I Handled"
            rows={summary.customers.slice(0, 15)}
            empty="No visits logged by you yet."
            render={(c) => <span className="d-inline-flex align-items-center gap-2">{c.name} <RegularBadge status={c.status} short /> <span className="text-secondary">— {c.count} visits</span></span>}
          />
        </div>
        <div className="col-lg-5">
          <div className="erp-card p-3 h-100">
            <h6 className="mb-3">My Visits by Purpose</h6>
            <Bars rows={summary.purposes} />
          </div>
        </div>
      </div>
    </div>
  );
}
