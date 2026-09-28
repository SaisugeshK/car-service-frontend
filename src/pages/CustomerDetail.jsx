import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { FiArrowLeft, FiPlus, FiChevronRight, FiStar } from 'react-icons/fi';
import { FaCarSide } from 'react-icons/fa';
import customersService from '../services/customersService';
import vehiclesService from '../services/vehiclesService';
import jobCardsService from '../services/jobCardsService';
import estimatesService from '../services/estimatesService';
import invoicesService from '../services/invoicesService';
import paymentsService from '../services/paymentsService';
import complaintsService from '../services/complaintsService';
import reviewsService from '../services/reviewsService';
import serviceRemindersService from '../services/serviceRemindersService';
import notificationsService from '../services/notificationsService';
import AddVehicleModal from '../components/AddVehicleModal';
import RegularBadge from '../components/RegularBadge';
import LogVisitModal from '../components/LogVisitModal';
import visitsService, { purposeLabel } from '../services/visitsService';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const JOBCARD_TONE = {
  RECEIVED: 'bg-secondary', INSPECTION: 'bg-info text-dark', ESTIMATE: 'bg-info text-dark',
  WAITING_APPROVAL: 'bg-warning text-dark', APPROVED: 'bg-primary', IN_PROGRESS: 'bg-primary',
  WAITING_FOR_PARTS: 'bg-warning text-dark', ADDITIONAL_APPROVAL_REQUIRED: 'bg-warning text-dark',
  QUALITY_CHECK: 'bg-warning text-dark', READY_FOR_DELIVERY: 'bg-success', DELIVERED: 'bg-success',
  CANCELLED: 'bg-danger',
};
const ESTIMATE_TONE = {
  APPROVED: 'bg-success', REJECTED: 'bg-danger', CHANGES_REQUESTED: 'bg-info text-dark', PENDING: 'bg-warning text-dark',
};
const INVOICE_TONE = { PAID: 'bg-success', PARTIAL: 'bg-warning text-dark', UNPAID: 'bg-danger' };
const COMPLAINT_TONE = { OPEN: 'bg-danger', IN_PROGRESS: 'bg-warning text-dark', RESOLVED: 'bg-success', CLOSED: 'bg-secondary' };
const REMINDER_TONE = { OVERDUE: 'bg-danger', DUE: 'bg-warning text-dark', UPCOMING: 'bg-info text-dark', DONE: 'bg-success' };

const TABS = ['Overview', 'Visit History', 'Vehicles', 'Job Cards', 'Estimates', 'Invoices', 'Payments', 'Complaints', 'Reviews', 'Reminders', 'Offers'];
// An EMPLOYEE gets no billing, CRM or money figures — and the API refuses those calls anyway.
const EMPLOYEE_TABS = ['Overview', 'Visit History', 'Vehicles', 'Job Cards', 'Complaints'];
const none = () => Promise.resolve([]);

function Stars({ value }) {
  if (!value) return '—';
  return (
    <span className={value <= 2 ? 'text-danger' : 'text-warning'}>
      {[1, 2, 3, 4, 5].map((n) => <FiStar key={n} size={12} fill={n <= value ? 'currentColor' : 'none'} style={{ marginRight: 1 }} />)}
    </span>
  );
}

function TabBadge({ count }) {
  if (!count) return null;
  return <span className="badge bg-secondary ms-1" style={{ fontSize: 10 }}>{count}</span>;
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { isSuperAdmin } = useAuth();
  const tabs = isSuperAdmin ? TABS : EMPLOYEE_TABS;

  const load = () => {
    setLoadError(false);
    Promise.all([
      customersService.getById(id),
      vehiclesService.getByCustomer(id),
      jobCardsService.getAll(),
      isSuperAdmin ? estimatesService.getAll() : none(),
      isSuperAdmin ? invoicesService.getAll() : none(),
      isSuperAdmin ? paymentsService.getAll() : none(),
      complaintsService.getAll(),
      isSuperAdmin ? reviewsService.getAll() : none(),
      isSuperAdmin ? serviceRemindersService.getAll() : none(),
      isSuperAdmin ? notificationsService.getAll() : none(),
    ]).then(([customer, vehicles, jobCards, estimates, invoices, payments, complaints, reviews, reminders, notifications]) => {
      setData({
        customer,
        vehicles: asList(vehicles),
        jobCards: asList(jobCards),
        estimates: asList(estimates),
        invoices: asList(invoices),
        payments: asList(payments),
        complaints: asList(complaints),
        reviews: asList(reviews),
        reminders: asList(reminders),
        notifications: asList(notifications),
      });
    }).catch(() => setLoadError(true));
  };

  useEffect(load, [id, isSuperAdmin]);

  // Every list below is fetched whole (same convention as every other page in this app —
  // Estimates/Reviews/Dashboard all filter client-side) and narrowed to this one customer here.
  const scoped = useMemo(() => {
    if (!data) return null;
    const cid = Number(id);
    const vehicleIds = new Set(data.vehicles.map((v) => v.vehicleId));
    const jobCards = data.jobCards.filter((j) => j.customerId === cid).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const jobCardByInvoiceId = new Map(data.jobCards.filter((j) => j.invoiceId).map((j) => [j.invoiceId, j]));
    const estimates = data.estimates.filter((e) => e.customerId === cid).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const invoices = data.invoices.filter((inv) => inv.customerId === cid).sort((a, b) => new Date(b.invoiceDate || b.createdAt) - new Date(a.invoiceDate || a.createdAt));
    const payments = data.payments.filter((p) => p.customerId === cid).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
    const complaints = data.complaints.filter((c) => c.customerId === cid).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const reviews = data.reviews.filter((r) => r.customerId === cid).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const reminders = data.reminders.filter((r) => r.customerId === cid).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const customerPhones = [data.customer.phone, data.customer.whatsappNumber].filter(Boolean);
    const offers = data.notifications
      .filter((n) => n.referenceType === 'OFFER_CAMPAIGN' && customerPhones.includes(n.recipientPhone))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const activeInvoices = invoices.filter((inv) => inv.status !== 'CANCELLED');
    const outstanding = activeInvoices.reduce((s, inv) => s + Number(inv.balanceAmount || 0), 0);
    const totalSpent = activeInvoices.reduce((s, inv) => s + Number(inv.paidAmount || 0), 0);
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length : null;

    return {
      jobCards, jobCardByInvoiceId, estimates, invoices, payments, complaints, reviews, reminders, offers,
      outstanding, totalSpent, avgRating, vehicleIds,
    };
  }, [data, id]);

  if (loadError) return <ErrorPage message="Could not load this customer. Check your connection and try again." onRetry={load} />;
  if (!data || !scoped) return <Loader label="Loading customer..." />;
  const { customer, vehicles } = data;

  return (
    <div>
      <button className="btn btn-light border-0 p-1 mb-2" onClick={() => navigate('/customers')}>
        <FiArrowLeft size={14} /> All Customers
      </button>
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title d-flex align-items-center gap-2 flex-wrap">
            {customer.customerName} <RegularBadge status={customer.regularStatus} className="fs-6" />
          </h1>
          <div className="text-secondary small">
            {customer.phone}{customer.city && ` · ${customer.city}`}
            {` · ${customer.totalVisits || 0} visit${customer.totalVisits === 1 ? '' : 's'}`}
            {customer.lastVisitDate && ` · Last visit ${dayjs(customer.lastVisitDate).format('DD MMM YYYY')}`}
            {customer.lastServiceDate && ` · Last service ${dayjs(customer.lastServiceDate).format('DD MMM YYYY')}`}
          </div>
        </div>
      </div>

      {isSuperAdmin && (
      <div className="row g-3 mb-3">
        <div className="col-6 col-lg-3">
          <div className="erp-stat-card"><div className="text-secondary small">Total Visits</div><div className="erp-stat-value">{scoped.jobCards.length}</div></div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="erp-stat-card"><div className="text-secondary small">Total Spent</div><div className="erp-stat-value">{money(scoped.totalSpent)}</div></div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="erp-stat-card">
            <div className="text-secondary small">Outstanding</div>
            <div className={`erp-stat-value ${scoped.outstanding > 0 ? 'text-danger' : ''}`}>{money(scoped.outstanding)}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="erp-stat-card">
            <div className="text-secondary small">Avg Rating</div>
            <div className="erp-stat-value">{scoped.avgRating != null ? <>{scoped.avgRating.toFixed(1)} <Stars value={Math.round(scoped.avgRating)} /></> : '—'}</div>
          </div>
        </div>
      </div>
      )}

      <ul className="nav nav-tabs mb-3" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {tabs.map((t) => (
          <li className="nav-item" key={t} style={{ whiteSpace: 'nowrap' }}>
            <button className={`nav-link ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t}
              {t === 'Vehicles' && <TabBadge count={vehicles.length} />}
              {t === 'Job Cards' && <TabBadge count={scoped.jobCards.length} />}
              {t === 'Estimates' && <TabBadge count={scoped.estimates.length} />}
              {t === 'Invoices' && <TabBadge count={scoped.invoices.length} />}
              {t === 'Complaints' && <TabBadge count={scoped.complaints.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length} />}
              {t === 'Reminders' && <TabBadge count={scoped.reminders.filter((r) => r.status === 'DUE' || r.status === 'OVERDUE').length} />}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'Overview' && <OverviewTab customer={customer} scoped={scoped} navigate={navigate} />}
      {tab === 'Visit History' && <VisitHistoryTab customer={customer} vehicles={vehicles} onChanged={load} />}
      {tab === 'Vehicles' && <VehiclesTab vehicles={vehicles} navigate={navigate} onAddVehicle={isSuperAdmin ? () => setShowAddVehicle(true) : null} />}
      {tab === 'Job Cards' && <JobCardsTab jobCards={scoped.jobCards} navigate={navigate} />}
      {tab === 'Estimates' && <EstimatesTab estimates={scoped.estimates} navigate={navigate} />}
      {tab === 'Invoices' && <InvoicesTab invoices={scoped.invoices} jobCardByInvoiceId={scoped.jobCardByInvoiceId} outstanding={scoped.outstanding} />}
      {tab === 'Payments' && <PaymentsTab payments={scoped.payments} />}
      {tab === 'Complaints' && <ComplaintsTab complaints={scoped.complaints} />}
      {tab === 'Reviews' && <ReviewsTab reviews={scoped.reviews} />}
      {tab === 'Reminders' && <RemindersTab reminders={scoped.reminders} />}
      {tab === 'Offers' && <OffersTab offers={scoped.offers} />}

      <AddVehicleModal
        show={showAddVehicle}
        customer={{ id: customer.id, customerName: customer.customerName }}
        onClose={() => setShowAddVehicle(false)}
        onCreated={() => { setShowAddVehicle(false); load(); }}
      />
    </div>
  );
}

/* ---------------- Overview ---------------- */
function OverviewTab({ customer, scoped, navigate }) {
  const recentActivity = useMemo(() => {
    const events = [
      ...scoped.jobCards.map((j) => ({ date: j.createdAt, label: `Job card ${j.jobCardNumber} opened`, type: 'job', onClick: () => navigate(`/job-cards/${j.jobCardId}`) })),
      ...scoped.invoices.map((inv) => ({ date: inv.invoiceDate || inv.createdAt, label: `Invoice ${inv.invoiceNumber} — ${money(inv.grandTotal)}`, type: 'invoice' })),
      ...scoped.complaints.map((c) => ({ date: c.createdAt, label: `Complaint: ${c.description?.slice(0, 40)}${c.description?.length > 40 ? '…' : ''}`, type: 'complaint' })),
      ...scoped.reviews.map((r) => ({ date: r.createdAt, label: `Review: ${r.rating}★${r.comment ? ` — ${r.comment.slice(0, 30)}` : ''}`, type: 'review' })),
    ].filter((e) => e.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
    return events;
  }, [scoped, navigate]);

  return (
    <div className="row g-3">
      <div className="col-lg-5">
        <div className="erp-card p-3">
          <h6 className="mb-3">Customer Information</h6>
          <dl className="row mb-0 small">
            <dt className="col-4 text-secondary fw-normal">Mobile</dt><dd className="col-8">{customer.phone || '—'}</dd>
            <dt className="col-4 text-secondary fw-normal">WhatsApp</dt><dd className="col-8">{customer.whatsappNumber || '—'}</dd>
            <dt className="col-4 text-secondary fw-normal">Alt. Mobile</dt><dd className="col-8">{customer.alternateMobile || '—'}</dd>
            <dt className="col-4 text-secondary fw-normal">Email</dt><dd className="col-8">{customer.email || '—'}</dd>
            <dt className="col-4 text-secondary fw-normal">Address</dt><dd className="col-8">{customer.address || '—'}</dd>
            <dt className="col-4 text-secondary fw-normal">City</dt><dd className="col-8">{customer.city || '—'}</dd>
            <dt className="col-4 text-secondary fw-normal">State</dt><dd className="col-8">{customer.state || '—'}</dd>
            <dt className="col-4 text-secondary fw-normal">Pincode</dt><dd className="col-8">{customer.pincode || '—'}</dd>
            <dt className="col-4 text-secondary fw-normal">GSTIN</dt><dd className="col-8">{customer.gstin || '—'}</dd>
            <dt className="col-4 text-secondary fw-normal">Status</dt>
            <dd className="col-8"><span className={`badge ${String(customer.status).toLowerCase() === 'active' ? 'bg-success' : 'bg-secondary'}`}>{customer.status}</span></dd>
            {customer.notes && (<><dt className="col-4 text-secondary fw-normal">Notes</dt><dd className="col-8">{customer.notes}</dd></>)}
          </dl>
        </div>
      </div>
      <div className="col-lg-7">
        <div className="erp-card p-3">
          <h6 className="mb-3">Recent Activity</h6>
          {recentActivity.length === 0 ? (
            <p className="text-secondary small mb-0">No activity recorded yet.</p>
          ) : (
            <ul className="list-unstyled mb-0">
              {recentActivity.map((e, i) => (
                <li key={i} className="d-flex gap-2 mb-2 small" style={{ cursor: e.onClick ? 'pointer' : 'default' }} onClick={e.onClick}>
                  <span className="text-secondary" style={{ minWidth: 90 }}>{dayjs(e.date).format('DD MMM YYYY')}</span>
                  <span className={e.onClick ? 'text-primary' : ''}>{e.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Visit History ---------------- */
function VisitHistoryTab({ customer, vehicles, onChanged }) {
  const [visits, setVisits] = useState(null);
  const [showLog, setShowLog] = useState(false);

  const loadVisits = () => visitsService.getByCustomer(customer.customerId ?? customer.id)
    .then((data) => setVisits(asList(data)))
    .catch(() => setVisits([]));
  useEffect(() => { loadVisits(); }, [customer.customerId, customer.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="erp-card p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Visit History</h6>
        <button className="btn btn-sm btn-primary d-flex align-items-center gap-1" onClick={() => setShowLog(true)}>
          <FiPlus size={13} /> Log Visit
        </button>
      </div>
      {visits === null ? <Loader label="Loading visits..." /> : visits.length === 0 ? (
        <p className="text-secondary small mb-0">No visits recorded yet.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead><tr><th>Date</th><th>Purpose</th><th>Vehicle</th><th>Notes</th><th>Handled By</th></tr></thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.visitId}>
                  <td className="text-nowrap">{dayjs(v.visitDateTime).format('DD MMM YYYY, hh:mm A')}</td>
                  <td>{purposeLabel(v.purpose)}{v.source === 'JOB_CARD' && <span className="badge bg-light text-dark border ms-1">Job card</span>}</td>
                  <td>{v.vehicleModel ? `${v.vehicleModel} (${v.registrationNumber || '—'})` : '—'}</td>
                  <td className="small">{v.notes || '—'}</td>
                  <td>{v.handledByName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showLog && (
        <LogVisitModal
          customer={customer}
          vehicles={vehicles}
          onClose={() => setShowLog(false)}
          onLogged={() => { setShowLog(false); loadVisits(); onChanged(); }}
        />
      )}
    </div>
  );
}

/* ---------------- Vehicles ---------------- */
function VehiclesTab({ vehicles, navigate, onAddVehicle }) {
  const today = dayjs();
  return (
    <div className="erp-card p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Vehicles</h6>
        {onAddVehicle && (
          <button className="btn btn-sm btn-primary d-flex align-items-center gap-1" onClick={onAddVehicle}>
            <FiPlus size={13} /> Add Vehicle
          </button>
        )}
      </div>
      {vehicles.length === 0 ? (
        <p className="text-secondary small mb-0">No vehicles on file yet.</p>
      ) : (
        <div className="d-flex flex-column gap-2">
          {vehicles.map((v) => {
            const insuranceExpired = v.insuranceExpiry && today.isAfter(dayjs(v.insuranceExpiry));
            const pucExpired = v.pucExpiry && today.isAfter(dayjs(v.pucExpiry));
            return (
              <button
                key={v.vehicleId}
                className="btn btn-light border d-flex align-items-center justify-content-between text-start"
                onClick={() => navigate(`/job-cards?vehicleId=${v.vehicleId}`)}
              >
                <span className="d-flex align-items-center gap-2">
                  <FaCarSide className="text-secondary" />
                  <span>
                    <span className="fw-semibold">{[v.make, v.vehicleModel].filter(Boolean).join(' ')}</span>
                    <span className="text-secondary"> — {v.registrationNumber}</span>
                    {v.vehicleCategory && <span className="badge bg-secondary ms-2">{v.vehicleCategory}</span>}
                    <div className="text-secondary small">
                      {v.odometer != null && `${v.odometer} km`}
                      {insuranceExpired && <span className="text-danger ms-2">Insurance expired</span>}
                      {pucExpired && <span className="text-danger ms-2">PUC expired</span>}
                    </div>
                  </span>
                </span>
                <FiChevronRight className="text-secondary" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Job Cards (Service History) ---------------- */
function JobCardsTab({ jobCards, navigate }) {
  return (
    <div className="erp-card p-0">
      <div className="p-3 pb-0 small text-secondary">Full inspection detail is on each job card's Inspection tab.</div>
      <div className="table-responsive">
        <table className="table mb-0">
          <thead><tr><th>Job Card</th><th>Vehicle</th><th>Date</th><th>Status</th><th>Invoice</th></tr></thead>
          <tbody>
            {jobCards.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-3">No job cards yet.</td></tr>}
            {jobCards.map((j) => (
              <tr key={j.jobCardId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/job-cards/${j.jobCardId}`)}>
                <td className="fw-semibold">{j.jobCardNumber}</td>
                <td>{j.vehicleModel} · {j.registrationNumber}</td>
                <td>{dayjs(j.createdAt).format('DD MMM YYYY')}</td>
                <td><span className={`badge ${JOBCARD_TONE[j.status] || 'bg-secondary'}`}>{j.status?.replace(/_/g, ' ')}</span></td>
                <td>{j.invoiceNumber || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Estimates (+ Approvals) ---------------- */
function EstimatesTab({ estimates, navigate }) {
  return (
    <div className="table-responsive erp-card">
      <table className="table mb-0">
        <thead><tr><th>Estimate</th><th>Job Card</th><th>Amount</th><th>Status</th><th>Valid Until</th></tr></thead>
        <tbody>
          {estimates.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-3">No estimates yet.</td></tr>}
          {estimates.map((e) => (
            <tr key={e.estimateId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/job-cards/${e.jobCardId}`)}>
              <td>{e.estimateNumber}{(e.revisionNumber || 1) > 1 && ` REV ${e.revisionNumber}`}</td>
              <td>{e.jobCardId ? `Job Card #${e.jobCardId}` : '—'}</td>
              <td>{money(e.grandTotal)}</td>
              <td><span className={`badge ${ESTIMATE_TONE[e.status] || 'bg-warning text-dark'}`}>{e.status?.replace(/_/g, ' ')}</span></td>
              <td>{e.validUntil ? dayjs(e.validUntil).format('DD MMM YYYY') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Invoices (line items double as Parts Used / Services) ---------------- */
function InvoicesTab({ invoices, jobCardByInvoiceId, outstanding }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div>
      {outstanding > 0 && (
        <div className="alert alert-warning small mb-3">Total outstanding across all invoices: <strong>{money(outstanding)}</strong></div>
      )}
      <div className="erp-card p-0">
        <div className="table-responsive">
          <table className="table mb-0">
            <thead><tr><th /><th>Invoice</th><th>Job Card</th><th>Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.length === 0 && <tr><td colSpan={8} className="text-center text-muted py-3">No invoices yet.</td></tr>}
              {invoices.map((inv) => {
                const jc = jobCardByInvoiceId.get(inv.invoiceId);
                const isOpen = expanded === inv.invoiceId;
                return (
                  <Fragment key={inv.invoiceId}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : inv.invoiceId)}>
                      <td>{isOpen ? '▾' : '▸'}</td>
                      <td className="fw-semibold">{inv.invoiceNumber}</td>
                      <td>{jc ? jc.jobCardNumber : '—'}</td>
                      <td>{dayjs(inv.invoiceDate || inv.createdAt).format('DD MMM YYYY')}</td>
                      <td>{money(inv.grandTotal)}</td>
                      <td>{money(inv.paidAmount)}</td>
                      <td>{money(inv.balanceAmount)}</td>
                      <td><span className={`badge ${INVOICE_TONE[inv.paymentStatus] || 'bg-secondary'}`}>{inv.paymentStatus}</span></td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <div className="p-3" style={{ background: 'var(--erp-bg)' }}>
                            <div className="small fw-semibold text-secondary text-uppercase mb-2">Parts &amp; Services</div>
                            {(inv.items || []).length === 0 ? (
                              <div className="small text-secondary">No line items.</div>
                            ) : (
                              <table className="table table-sm mb-0">
                                <thead><tr><th>Type</th><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
                                <tbody>
                                  {inv.items.map((it) => (
                                    <tr key={it.invoiceItemId}>
                                      <td><span className={`badge ${it.itemType === 'SERVICE' ? 'erp-badge-service' : 'erp-badge-product'}`}>{it.itemType === 'SERVICE' ? 'Service' : 'Part'}</span></td>
                                      <td>{it.itemName || it.description}</td>
                                      <td>{it.quantity}</td>
                                      <td>{money(it.totalAmount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Payments ---------------- */
function PaymentsTab({ payments }) {
  return (
    <div className="table-responsive erp-card">
      <table className="table mb-0">
        <thead><tr><th>Date</th><th>Invoice</th><th>Amount</th><th>Method</th><th>Reference</th><th>Received By</th></tr></thead>
        <tbody>
          {payments.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-3">No payments yet.</td></tr>}
          {payments.map((p) => (
            <tr key={p.transactionId}>
              <td>{p.paymentDate ? dayjs(p.paymentDate).format('DD MMM YYYY, HH:mm') : '—'}</td>
              <td>{p.invoiceNumber || p.invoiceId}</td>
              <td>{money(p.amount)}</td>
              <td>{p.paymentMethod}</td>
              <td>{p.transactionReference || '—'}</td>
              <td>{p.receivedByName || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Complaints ---------------- */
function ComplaintsTab({ complaints }) {
  return (
    <div className="table-responsive erp-card">
      <table className="table mb-0">
        <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Priority</th><th>Status</th></tr></thead>
        <tbody>
          {complaints.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-3">No complaints on record.</td></tr>}
          {complaints.map((c) => (
            <tr key={c.complaintId}>
              <td>{dayjs(c.createdAt).format('DD MMM YYYY')}</td>
              <td>{c.type?.replace(/_/g, ' ') || '—'}</td>
              <td>{c.description}</td>
              <td><span className="badge bg-secondary">{c.priority}</span></td>
              <td><span className={`badge ${COMPLAINT_TONE[c.status] || 'bg-secondary'}`}>{c.status?.replace('_', ' ')}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Reviews ---------------- */
function ReviewsTab({ reviews }) {
  if (reviews.length === 0) return <div className="erp-card p-3 text-secondary small">No reviews from this customer yet.</div>;
  return (
    <div className="d-flex flex-column gap-2">
      {reviews.map((r) => (
        <div key={r.reviewId} className="erp-card p-3">
          <div className="d-flex justify-content-between">
            <Stars value={r.rating} />
            <span className="text-secondary small">{dayjs(r.createdAt).format('DD MMM YYYY')}</span>
          </div>
          {r.comment && <div className="small mt-1">{r.comment}</div>}
          {r.jobCardNumber && <div className="text-secondary small mt-1">{r.jobCardNumber}</div>}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Reminders ---------------- */
function RemindersTab({ reminders }) {
  return (
    <div className="table-responsive erp-card">
      <table className="table mb-0">
        <thead><tr><th>Type</th><th>Vehicle</th><th>Due Date</th><th>Status</th></tr></thead>
        <tbody>
          {reminders.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-3">No reminders on file.</td></tr>}
          {reminders.map((r) => (
            <tr key={r.reminderId}>
              <td>{r.reminderType?.replace(/_/g, ' ') || 'Next Service'}</td>
              <td>{r.vehicleModel} · {r.registrationNumber}</td>
              <td>{r.dueDate ? dayjs(r.dueDate).format('DD MMM YYYY') : '—'}</td>
              <td><span className={`badge ${REMINDER_TONE[r.status] || 'bg-secondary'}`}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Offers Sent ---------------- */
function OffersTab({ offers }) {
  const STATUS_TONE = { SENT: 'bg-primary', DELIVERED: 'bg-success', FAILED: 'bg-danger', NOT_CONFIGURED: 'bg-secondary' };
  return (
    <div className="table-responsive erp-card">
      <table className="table mb-0">
        <thead><tr><th>Date</th><th>Offer</th><th>Channel</th><th>Status</th></tr></thead>
        <tbody>
          {offers.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-3">No offers sent to this customer yet.</td></tr>}
          {offers.map((o) => (
            <tr key={o.notificationLogId}>
              <td>{dayjs(o.createdAt).format('DD MMM YYYY')}</td>
              <td>{o.subject}</td>
              <td>{o.channel}</td>
              <td><span className={`badge ${STATUS_TONE[o.status] || 'bg-secondary'}`}>{o.status?.replace('_', ' ')}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
