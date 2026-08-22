import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiX, FiUserCheck, FiClipboard, FiFileText, FiPackage } from 'react-icons/fi';
import { FaCarSide } from 'react-icons/fa';
import customersService from '../services/customersService';
import vehiclesService from '../services/vehiclesService';
import jobCardsService from '../services/jobCardsService';
import estimatesService from '../services/estimatesService';
import invoicesService from '../services/invoicesService';
import productsService from '../services/productsService';

const asList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);
const MAX_PER_GROUP = 5;
const DEBOUNCE_MS = 300;

const GROUP_META = {
  customers: { label: 'Customers', icon: FiUserCheck },
  vehicles: { label: 'Vehicles', icon: FaCarSide },
  jobCards: { label: 'Job Cards', icon: FiClipboard },
  estimates: { label: 'Estimates', icon: FiFileText },
  invoices: { label: 'Invoices', icon: FiFileText },
  products: { label: 'Products', icon: FiPackage },
};

// Navbar's global search — Phase 28. No backend search endpoint exists (nor should one be
// invented for this); every source list is already fetched whole by its own page elsewhere in
// this app, so the same convention applies here: fetch once (lazily, on first focus — not on
// every navbar mount, matching Phase 26's "avoid duplicate API calls"), filter client-side,
// debounce the keystrokes. Fast at this app's actual scale (a single workshop's data), not a
// distributed-search problem.
export default function GlobalSearch() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ customers: [], vehicles: [], jobCards: [], estimates: [], invoices: [], products: [] });

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const ensureLoaded = () => {
    if (loaded || loading) return;
    setLoading(true);
    Promise.all([
      customersService.getAll(),
      vehiclesService.getAll(),
      jobCardsService.getAll(),
      estimatesService.getAll(),
      invoicesService.getAll(),
      productsService.getAll({ itemType: 'PRODUCT' }),
    ])
      .then(([customers, vehicles, jobCards, estimates, invoices, products]) => {
        setData({
          customers: asList(customers),
          vehicles: asList(vehicles),
          jobCards: asList(jobCards),
          estimates: asList(estimates),
          invoices: asList(invoices),
          products: asList(products),
        });
        setLoaded(true);
      })
      .catch(() => {
        // Search degrades to "no results" rather than blocking the navbar over it — a failed
        // background index fetch shouldn't take down the whole header. Retried next focus.
      })
      .finally(() => setLoading(false));
  };

  const q = debouncedQuery.toLowerCase();
  const matches = (...fields) => fields.some((f) => f && String(f).toLowerCase().includes(q));

  const results = q.length < 2 ? null : {
    customers: data.customers
      .filter((c) => matches(c.customerName, c.phone, c.whatsappNumber, c.alternateMobile))
      .slice(0, MAX_PER_GROUP)
      .map((c) => ({ id: `c-${c.id}`, primary: c.customerName, secondary: c.phone, to: `/customers/${c.id}` })),
    vehicles: data.vehicles
      .filter((v) => matches(v.registrationNumber))
      .slice(0, MAX_PER_GROUP)
      .map((v) => ({ id: `v-${v.id}`, primary: v.registrationNumber, secondary: v.vehicleModel, to: `/customers/${v.customerId}` })),
    jobCards: data.jobCards
      .filter((j) => matches(j.jobCardNumber))
      .slice(0, MAX_PER_GROUP)
      .map((j) => ({ id: `j-${j.jobCardId}`, primary: j.jobCardNumber, secondary: `${j.customerName || ''} · ${j.vehicleModel || ''}`, to: `/job-cards/${j.jobCardId}` })),
    estimates: data.estimates
      .filter((e) => matches(e.estimateNumber))
      .slice(0, MAX_PER_GROUP)
      .map((e) => ({ id: `e-${e.estimateId}`, primary: e.estimateNumber, secondary: e.customerName, to: `/job-cards/${e.jobCardId}` })),
    invoices: data.invoices
      .filter((i) => matches(i.invoiceNumber))
      .slice(0, MAX_PER_GROUP)
      .map((i) => ({ id: `i-${i.invoiceId}`, primary: i.invoiceNumber, secondary: i.customerName, to: `/invoices?invoiceId=${i.invoiceId}` })),
    products: data.products
      .filter((p) => matches(p.sku, p.barcode))
      .slice(0, MAX_PER_GROUP)
      .map((p) => ({ id: `p-${p.id}`, primary: p.productName, secondary: p.sku || p.barcode, to: '/products' })),
  };

  const totalResults = results ? Object.values(results).reduce((sum, r) => sum + r.length, 0) : 0;

  const goTo = (to) => {
    setOpen(false);
    setQuery('');
    navigate(to);
  };

  return (
    <div className="position-relative erp-navbar-search d-none d-lg-block" ref={containerRef}>
      <div className="input-group">
        <span className="input-group-text bg-white">
          <FiSearch size={14} />
        </span>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Search customers, vehicles, job cards, invoices..."
          value={query}
          onFocus={() => { setOpen(true); ensureLoaded(); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        />
        {query && (
          <button type="button" className="btn btn-outline-secondary" onClick={() => { setQuery(''); setDebouncedQuery(''); }}>
            <FiX size={14} />
          </button>
        )}
      </div>

      {open && debouncedQuery.length >= 2 && (
        <div
          className="erp-card position-absolute top-100 start-0 mt-1 py-1"
          style={{ minWidth: 380, maxWidth: 440, maxHeight: 420, overflowY: 'auto', zIndex: 40 }}
        >
          {loading && !loaded && <div className="px-3 py-2 small text-secondary">Loading search index...</div>}
          {loaded && totalResults === 0 && <div className="px-3 py-2 small text-secondary">No matches for &quot;{debouncedQuery}&quot;.</div>}
          {loaded && results && Object.entries(results).map(([group, rows]) => {
            if (rows.length === 0) return null;
            const meta = GROUP_META[group];
            return (
              <div key={group}>
                <div className="px-3 pt-2 pb-1 small fw-semibold text-secondary text-uppercase d-flex align-items-center gap-1" style={{ fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                  <meta.icon size={11} /> {meta.label}
                </div>
                {rows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="btn btn-light border-0 w-100 text-start d-flex justify-content-between align-items-center px-3 py-2 rounded-0"
                    onClick={() => goTo(r.to)}
                  >
                    <span className="fw-semibold small">{r.primary || '—'}</span>
                    <span className="text-secondary text-truncate ms-2" style={{ fontSize: '0.76rem', maxWidth: 180 }}>{r.secondary || ''}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
