import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import {
  FiTrash2,
  FiTruck,
  FiArrowLeft,
  FiChevronDown,
  FiChevronUp,
  FiSave,
  FiCreditCard,
  FiCheck,
  FiCheckCircle,
  FiMessageCircle,
  FiMessageSquare,
  FiStar,
  FiDownload,
} from 'react-icons/fi';
import jobCardsService from '../services/jobCardsService';
import invoicesService from '../services/invoicesService';
import serviceMasterService from '../services/serviceMasterService';
import productsService from '../services/productsService';
import productTaxesService from '../services/productTaxesService';
import offersService from '../services/offersService';
import usersService from '../services/usersService';
import notificationsService from '../services/notificationsService';
import { calculateInvoiceTotals } from '../utils/invoiceCalculations';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import { vehicleSizeClassLabel } from '../utils/vehicleSizeClasses';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const STATUS_BADGE = {
  RECEIVED: 'bg-secondary', INSPECTION: 'bg-info text-dark', ESTIMATE: 'bg-info text-dark',
  WAITING_APPROVAL: 'bg-warning text-dark', APPROVED: 'bg-primary', IN_PROGRESS: 'bg-primary',
  WAITING_FOR_PARTS: 'bg-warning text-dark', ADDITIONAL_APPROVAL_REQUIRED: 'bg-warning text-dark',
  QUALITY_CHECK: 'bg-warning text-dark', READY_FOR_DELIVERY: 'bg-success', DELIVERED: 'bg-success',
  CANCELLED: 'bg-danger',
};

// Must match JobCardServiceImpl.QUICK_INVOICE_PAYMENT_METHODS.
const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'NET_BANKING', label: 'Net Banking' },
];

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

// The price set for this job card's vehicle size on the service, or the service's base price.
// The advisor can still edit any line after it's added.
const servicePriceFor = (service, jobCard) => {
  const hit = (service?.sizePrices || []).find((sp) => sp.sizeClassCode === jobCard?.vehicleSizeClass);
  return Number(hit?.price ?? service?.defaultPrice ?? 0);
};

// Unsaved service/product lines and coupon survive a page reload or navigating away — nothing
// is written to the server until Paid, so without this a half-filled job card was lost.
const draftKey = (jobCardId) => `jobcard-draft-${jobCardId}`;
const readDraft = (jobCardId) => {
  try {
    return JSON.parse(localStorage.getItem(draftKey(jobCardId))) || null;
  } catch {
    return null;
  }
};
const writeDraft = (jobCardId, draft) => {
  try {
    localStorage.setItem(draftKey(jobCardId), JSON.stringify(draft));
  } catch {
    // storage blocked — draft just won't persist
  }
};
const clearDraft = (jobCardId) => {
  try {
    localStorage.removeItem(draftKey(jobCardId));
  } catch {
    // ignore
  }
};

const offerLabel = (offer) => (offer.discountType === 'PERCENTAGE'
  ? `${Number(offer.discountValue)}% off`
  : `₹${Number(offer.discountValue).toFixed(2)} off`);

// Current/upcoming offers for this bill, straight from the server's check — no typing needed
// when an offer exists. Usable ones get Apply; the rest say exactly why they can't be used.
function OfferList({ checks, appliedCode, onApply, onRemove }) {
  if (checks === null) return <div className="small text-secondary">Checking offers...</div>;
  if (checks.length === 0) return <div className="small text-secondary">No offers running right now.</div>;
  return (
    <div className="d-flex flex-column gap-2">
      {checks.map(({ offer, eligible, message, discountAmount }) => {
        const applied = offer.couponCode === appliedCode;
        return (
          <div
            key={offer.offerId}
            className="border rounded p-2 small"
            style={{
              borderColor: applied ? 'var(--erp-primary)' : undefined,
              background: applied ? 'var(--erp-primary-light, #fff7e0)' : undefined,
              opacity: eligible || applied ? 1 : 0.75,
            }}
          >
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div className="fw-semibold">
                  {offer.offerName} <span className="text-success">· {offerLabel(offer)}</span>
                </div>
                <div className="font-monospace text-secondary" style={{ fontSize: 11 }}>{offer.couponCode}</div>
              </div>
              {applied ? (
                <button type="button" className="btn btn-sm btn-outline-danger py-0" onClick={onRemove}>Remove</button>
              ) : eligible ? (
                <button type="button" className="btn btn-sm btn-primary py-0" onClick={() => onApply(offer.couponCode)}>Apply</button>
              ) : null}
            </div>
            {eligible ? (
              <div className="text-success">
                {applied ? 'Applied' : 'Saves'} ₹{Number(discountAmount).toFixed(2)}
                {offer.endDateTime && ` · ends ${dayjs(offer.endDateTime).format('DD MMM, hh:mm A')}`}
              </div>
            ) : (
              <div className={applied ? 'text-danger fw-semibold' : 'text-secondary'}>{message}</div>
            )}
            {offer.endingSoon && <span className="badge bg-warning text-dark mt-1">Ending soon</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function JobCardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { isSuperAdmin } = useAuth();

  const reload = () => {
    setLoadError(false);
    jobCardsService.getById(id).then(setJobCard).catch(() => setLoadError(true));
  };

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    jobCardsService.getById(id)
      .then(setJobCard)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loadError) return <ErrorPage message="Could not load this job card. Check your connection and try again." onRetry={reload} />;
  if (loading || !jobCard) return <Loader label="Loading job card..." />;

  const badge = STATUS_BADGE[jobCard.status] || 'bg-secondary';

  return (
    <div>
      <div className="erp-page-header">
        <div>
          <button className="btn btn-light border-0 p-1 mb-1" onClick={() => navigate('/job-cards')}>
            <FiArrowLeft size={14} /> All Job Cards
          </button>
          <h1 className="erp-page-title">
            {jobCard.jobCardNumber} <span className={`badge ${badge} ms-2`}>{jobCard.status.replace(/_/g, ' ')}</span>
          </h1>
          <div className="text-secondary small">
            {jobCard.customerName} · {jobCard.vehicleModel} · {jobCard.registrationNumber}
          </div>
        </div>
      </div>

      {!isSuperAdmin
        ? <EmployeeJobCardView jobCard={jobCard} onSaved={reload} />
        : jobCard.invoiceId
          ? <PaidInvoice jobCard={jobCard} onSaved={reload} />
          : <JobCardForm jobCard={jobCard} onSaved={reload} />}
    </div>
  );
}

/* ---------------- Employee view ----------------
 * An assigned technician/advisor: sees the job, moves it through the workshop states and keeps
 * the work notes up to date. No prices, discounts or payment — and the backend strips any other
 * field an EMPLOYEE sends (JobCardServiceImpl.updateJobCard).
 */
// Must match JobCardServiceImpl.EMPLOYEE_STATUSES.
const EMPLOYEE_STATUSES = ['RECEIVED', 'INSPECTION', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'QUALITY_CHECK', 'READY_FOR_DELIVERY'];

function EmployeeJobCardView({ jobCard, onSaved }) {
  const locked = !EMPLOYEE_STATUSES.includes(jobCard.status);
  const [status, setStatus] = useState(jobCard.status);
  const [workRequired, setWorkRequired] = useState(jobCard.workRequired || '');
  const [vehicleConditionNotes, setVehicleConditionNotes] = useState(jobCard.vehicleConditionNotes || '');
  const [internalNotes, setInternalNotes] = useState(jobCard.internalNotes || '');
  const [odometer, setOdometer] = useState(jobCard.odometer ?? '');
  const [fuelLevel, setFuelLevel] = useState(jobCard.fuelLevel || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await jobCardsService.update(jobCard.jobCardId, {
        status: locked || status === jobCard.status ? undefined : status,
        workRequired,
        vehicleConditionNotes,
        internalNotes,
        odometer: odometer !== '' ? Number(odometer) : null,
        fuelLevel: fuelLevel || null,
      });
      toast.success('Job card updated');
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  };

  const detail = (label, value) => (
    <>
      <dt className="col-5 text-secondary fw-normal">{label}</dt>
      <dd className="col-7">{value || '—'}</dd>
    </>
  );

  return (
    <div className="row g-3">
      <div className="col-lg-5">
        <div className="erp-card p-3">
          <h6 className="mb-3">Job Details</h6>
          <dl className="row small mb-0">
            {detail('Customer', jobCard.customerName)}
            {detail('Phone', jobCard.customerPhone)}
            {detail('Vehicle', jobCard.vehicleModel)}
            {detail('Registration', jobCard.registrationNumber)}
            {detail('Complaint', jobCard.complaint)}
            {detail('Expected Delivery', jobCard.expectedDelivery && dayjs(jobCard.expectedDelivery).format('DD MMM YYYY'))}
            {detail('Technician', jobCard.technicianName)}
            {detail('Service Advisor', jobCard.advisorName)}
            {detail('Keys Received', jobCard.keysReceived ? 'Yes' : 'No')}
            {detail('Accessories', jobCard.accessoriesReceived)}
          </dl>
        </div>
      </div>
      <div className="col-lg-7">
        <div className="erp-card p-3">
          <h6 className="mb-3">Update Work</h6>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="emp-status">Status</label>
              {locked ? (
                <div className="form-control-plaintext">
                  <span className={`badge ${STATUS_BADGE[jobCard.status] || 'bg-secondary'}`}>{jobCard.status.replace(/_/g, ' ')}</span>
                  <div className="small text-secondary">Only an admin can change it from this status.</div>
                </div>
              ) : (
                <select id="emp-status" className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {EMPLOYEE_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              )}
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="emp-odo">Odometer (km)</label>
              <input id="emp-odo" type="number" min="0" className="form-control" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="emp-fuel">Fuel Level</label>
              <select id="emp-fuel" className="form-select" value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value)}>
                <option value="">—</option>
                {['Empty', '1/4', '1/2', '3/4', 'Full'].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="emp-work">Work Required / Done</label>
              <textarea id="emp-work" className="form-control" rows={3} value={workRequired} onChange={(e) => setWorkRequired(e.target.value)} />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="emp-cond">Vehicle Condition Notes</label>
              <textarea id="emp-cond" className="form-control" rows={2} value={vehicleConditionNotes} onChange={(e) => setVehicleConditionNotes(e.target.value)} placeholder="e.g. Front bumper scratch" />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="emp-notes">Internal Notes</label>
              <textarea id="emp-notes" className="form-control" rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary mt-3 d-inline-flex align-items-center gap-1" onClick={save} disabled={saving}>
            <FiSave size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Single-page job card form ----------------
 * Complaint, technician, services, products, discount and payment on one screen. "Paid" posts
 * everything to /job-cards/{id}/quick-invoice, which creates the invoice (same Invoices module
 * as POS) paid in full and links it to this job card.
 */
function JobCardForm({ jobCard, onSaved }) {
  const draft = useMemo(() => readDraft(jobCard.jobCardId), [jobCard.jobCardId]);

  const [complaint, setComplaint] = useState(jobCard.complaint || '');
  const [expectedDelivery, setExpectedDelivery] = useState(jobCard.expectedDelivery ? dayjs(jobCard.expectedDelivery).format('YYYY-MM-DD') : '');
  const [technicianUserId, setTechnicianUserId] = useState(jobCard.technicianUserId || '');
  const [users, setUsers] = useState([]);
  // GET /api/users is SUPER_ADMIN-only — a MANAGER gets an honest message instead of an empty dropdown.
  const [staffListUnavailable, setStaffListUnavailable] = useState(false);

  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [productTaxes, setProductTaxes] = useState([]);
  const [serviceQuery, setServiceQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');

  const [serviceLines, setServiceLines] = useState(draft?.serviceLines || []);
  const [productLines, setProductLines] = useState(draft?.productLines || []);
  // Offers for this bill, each checked by the server: [{ offer, eligible, message, discountAmount }].
  const [offerChecks, setOfferChecks] = useState(null);
  const [appliedCode, setAppliedCode] = useState(draft?.appliedCode || null);
  // Staff removed the auto-applied offer — don't silently put one back.
  const [offerDeclined, setOfferDeclined] = useState(Boolean(draft?.offerDeclined));
  const [couponInput, setCouponInput] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [extraDiscount, setExtraDiscount] = useState(draft?.extraDiscount ?? '');

  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    usersService.getAll(undefined, { skipErrorToast: true })
      .then((data) => setUsers(asList(data)))
      .catch(() => setStaffListUnavailable(true));
    Promise.all([serviceMasterService.getAll(), productsService.getAll({ itemType: 'PRODUCT' }), productTaxesService.getAll()])
      .then(([s, p, t]) => {
        setServices(asList(s).filter((x) => (x.status || 'active').toLowerCase() === 'active'));
        setProducts(asList(p));
        setProductTaxes(asList(t));
      });
  }, []);

  useEffect(() => {
    writeDraft(jobCard.jobCardId, { serviceLines, productLines, appliedCode, offerDeclined, extraDiscount });
  }, [jobCard.jobCardId, serviceLines, productLines, appliedCode, offerDeclined, extraDiscount]);

  // Vehicle-type applies-to-both convention: blank/null vehicleType means every vehicle.
  const matchesVehicle = (item) => !item.vehicleType || !jobCard.vehicleCategory || item.vehicleType === jobCard.vehicleCategory;

  const serviceResults = useMemo(() => {
    if (!serviceQuery.trim()) return [];
    const q = serviceQuery.toLowerCase();
    return services
      .filter((s) => matchesVehicle(s) && (s.serviceName?.toLowerCase().includes(q) || s.serviceCode?.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [serviceQuery, services, jobCard.vehicleCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const productResults = useMemo(() => {
    if (!productQuery.trim()) return [];
    const q = productQuery.toLowerCase();
    return products
      .filter((p) => matchesVehicle(p) && (p.productName?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [productQuery, products, jobCard.vehicleCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const addService = (s) => {
    setServiceQuery('');
    if (serviceLines.some((l) => l.refId === s.serviceId)) return toast.error(`${s.serviceName} is already added`);
    setServiceLines((prev) => [...prev, {
      refId: s.serviceId,
      name: s.serviceName,
      unitPrice: servicePriceFor(s, jobCard),
      taxPercentage: Number(s.gstPercentage || 0),
    }]);
  };

  const addProduct = (p) => {
    setProductQuery('');
    const existing = productLines.find((l) => l.refId === p.productId);
    if (existing) {
      setProductLines((prev) => prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l)));
      return;
    }
    setProductLines((prev) => [...prev, {
      refId: p.productId,
      name: p.productName,
      unitPrice: Number(p.sellingPrice || 0),
      quantity: 1,
      stockQuantity: p.stockQuantity,
      // Live preview only — the server re-resolves ProductTax when the invoice is created.
      taxPercentage: Number(productTaxes.find((t) => t.productId === p.productId)?.taxPercentage ?? 0),
    }]);
  };

  const updateService = (idx, patch) => setServiceLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const updateProduct = (idx, patch) => setProductLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const calcLines = [
    ...serviceLines.map((l) => ({ itemType: 'SERVICE', unitPrice: Number(l.unitPrice || 0), quantity: 1, discount: 0, taxPercentage: l.taxPercentage })),
    ...productLines.map((l) => ({ itemType: 'PRODUCT', unitPrice: Number(l.unitPrice || 0), quantity: Number(l.quantity || 0), discount: 0, taxPercentage: l.taxPercentage })),
  ];
  const beforeDiscount = calculateInvoiceTotals(calcLines, 0);
  const billAmount = Math.round(beforeDiscount.grandTotal * 100) / 100;

  // Re-check every offer against the bill whenever it changes (debounced) — the server applies
  // the same rules again at payment, so what's shown here is exactly what will be accepted.
  useEffect(() => {
    const timer = setTimeout(() => {
      offersService.getApplicable(
        { billAmount, vehicleType: jobCard.vehicleCategory || null },
        { skipErrorToast: true },
      ).then((data) => setOfferChecks(asList(data))).catch(() => setOfferChecks([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [billAmount, jobCard.vehicleCategory]);

  // Auto-apply the best usable offer (list comes back best-first) unless staff removed it.
  useEffect(() => {
    if (!offerChecks || appliedCode || offerDeclined) return;
    const best = offerChecks.find((c) => c.eligible && Number(c.discountAmount) > 0);
    if (best) setAppliedCode(best.offer.couponCode);
  }, [offerChecks, appliedCode, offerDeclined]);

  // A saved-draft offer that has since expired or been disabled drops out of the list entirely —
  // clear it so the best current offer can be applied instead.
  useEffect(() => {
    if (offerChecks && appliedCode && !offerChecks.some((c) => c.offer?.couponCode === appliedCode)) {
      toast(`Offer ${appliedCode} is no longer available`, { icon: 'ℹ️' });
      setAppliedCode(null);
    }
  }, [offerChecks, appliedCode]);

  const appliedCheck = appliedCode ? offerChecks?.find((c) => c.offer?.couponCode === appliedCode) : null;
  const appliedUsable = Boolean(appliedCheck?.eligible);
  const couponDiscount = appliedUsable ? Number(appliedCheck.discountAmount || 0) : 0;
  const manualDiscount = Number(extraDiscount || 0);
  const discountAmount = couponDiscount + manualDiscount;
  const totals = calculateInvoiceTotals(calcLines, discountAmount);

  const applyOffer = (code) => {
    setAppliedCode(code);
    setOfferDeclined(false);
  };

  const removeOffer = () => {
    setAppliedCode(null);
    setOfferDeclined(true);
  };

  const applyTypedCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return toast.error('Enter a coupon code');
    setCheckingCoupon(true);
    try {
      const result = await offersService.validateCoupon({
        couponCode: code,
        billAmount,
        vehicleType: jobCard.vehicleCategory || null,
      });
      if (!result.eligible) return toast.error(result.message);
      applyOffer(result.offer.couponCode);
      setCouponInput('');
      toast.success(`${result.offer.offerName} applied`);
    } catch {
      // toast already shown
    } finally {
      setCheckingCoupon(false);
    }
  };

  const jobCardFields = () => ({
    complaint,
    expectedDelivery: expectedDelivery ? dayjs(expectedDelivery).toISOString() : null,
    technicianUserId: technicianUserId ? Number(technicianUserId) : null,
  });

  const saveDetails = async () => {
    setSaving(true);
    try {
      await jobCardsService.update(jobCard.jobCardId, jobCardFields());
      toast.success('Job card saved');
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  };

  const validateBeforePayment = () => {
    if (serviceLines.length + productLines.length === 0) return 'Add at least one service or product';
    const badService = serviceLines.find((l) => !(Number(l.unitPrice) >= 0) || l.unitPrice === '');
    if (badService) return `Enter a valid amount for ${badService.name}`;
    const badProduct = productLines.find((l) => !(Number(l.quantity) > 0) || !(Number(l.unitPrice) >= 0) || l.unitPrice === '');
    if (badProduct) return `Enter a valid quantity and amount for ${badProduct.name}`;
    const overStock = productLines.find((l) => l.stockQuantity != null && Number(l.quantity) > l.stockQuantity);
    if (overStock) return `Only ${overStock.stockQuantity} of ${overStock.name} in stock`;
    if (!(manualDiscount >= 0)) return 'Extra discount cannot be negative';
    if (discountAmount > beforeDiscount.grandTotal) return 'Discount cannot be more than the bill amount';
    if (appliedCode && !appliedUsable) return `Offer ${appliedCode} can't be used on this bill — remove it first`;
    return null;
  };

  const openPayment = () => {
    const error = validateBeforePayment();
    if (error) return toast.error(error);
    setPaymentMethod('');
    setShowPayment(true);
  };

  const markPaid = async () => {
    if (!paymentMethod) return toast.error('Choose a payment method');
    setPaying(true);
    try {
      const inv = await jobCardsService.quickInvoice(jobCard.jobCardId, {
        ...jobCardFields(),
        couponCode: appliedUsable ? appliedCode : null,
        discountAmount: manualDiscount,
        paymentMethod,
        items: [
          ...serviceLines.map((l) => ({ itemType: 'SERVICE', serviceId: l.refId, description: l.name, quantity: 1, unitPrice: Number(l.unitPrice), discount: 0 })),
          ...productLines.map((l) => ({ itemType: 'PRODUCT', productId: l.refId, description: l.name, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), discount: 0 })),
        ],
      });
      clearDraft(jobCard.jobCardId);
      toast.success(`Paid — invoice ${inv.invoiceNumber} created`);
      setShowPayment(false);
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setPaying(false);
    }
  };

  const cancelled = jobCard.status === 'CANCELLED';

  return (
    <div className="row g-3">
      <div className="col-lg-8">
        {/* Complaint / Request */}
        <div className="erp-card p-3 mb-3">
          <h6 className="mb-3">Complaint / Request</h6>
          <div className="mb-3">
            <label className="form-label" htmlFor="jc-complaint">Complaint / Issue</label>
            <textarea id="jc-complaint" className="form-control" rows={3} value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="What the customer reported" />
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="jc-delivery">Expected Delivery Date</label>
              <input id="jc-delivery" type="date" className="form-control" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="jc-technician">Technician</label>
              <select id="jc-technician" className="form-select" value={technicianUserId} onChange={(e) => setTechnicianUserId(e.target.value)} disabled={staffListUnavailable}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
              </select>
              {staffListUnavailable && (
                <div className="form-text text-danger">Staff list couldn&apos;t be loaded for your role — ask a Super Admin to assign the technician.</div>
              )}
            </div>
          </div>
          <button className="btn btn-outline-primary btn-sm mt-3 d-inline-flex align-items-center gap-1" onClick={saveDetails} disabled={saving || cancelled}>
            <FiSave size={13} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Services */}
        <div className="erp-card p-3 mb-3">
          <h6 className="mb-2">Service Items</h6>
          {jobCard.vehicleSizeClass && (
            <div className="form-text text-primary mt-0 mb-2">
              {jobCard.vehicleModel || 'Vehicle'} · {vehicleSizeClassLabel(jobCard.vehicleSizeClass)} — prices for this size (editable)
            </div>
          )}
          <input className="form-control mb-2" placeholder="Search service to add..." value={serviceQuery} onChange={(e) => setServiceQuery(e.target.value)} aria-label="Search service" />
          {serviceResults.length > 0 && (
            <div className="list-group mb-2">
              {serviceResults.map((s) => (
                <button key={s.serviceId} type="button" className="list-group-item list-group-item-action d-flex justify-content-between" onClick={() => addService(s)}>
                  {s.serviceName} <strong>{servicePriceFor(s, jobCard).toFixed(2)}</strong>
                </button>
              ))}
            </div>
          )}
          <table className="table mb-0" style={{ tableLayout: 'fixed', width: '100%' }}>
            <tbody>
              {serviceLines.length === 0 && <tr><td className="text-center text-muted py-3">No services added.</td></tr>}
              {serviceLines.map((l, idx) => (
                <tr key={l.refId}>
                  <td className="align-middle">{l.name}</td>
                  <td style={{ width: 140 }}>
                    <input type="number" min="0" step="0.01" aria-label={`Amount for ${l.name}`} className="form-control form-control-sm text-end" value={l.unitPrice} onChange={(e) => updateService(idx, { unitPrice: e.target.value })} />
                  </td>
                  <td style={{ width: 48 }}>
                    <button className="btn btn-sm btn-outline-danger" aria-label={`Remove ${l.name}`} onClick={() => setServiceLines((prev) => prev.filter((_, i) => i !== idx))}><FiTrash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Products */}
        <div className="erp-card p-3 mb-3">
          <h6 className="mb-2">Products</h6>
          <input className="form-control mb-2" placeholder="Search product to add..." value={productQuery} onChange={(e) => setProductQuery(e.target.value)} aria-label="Search product" />
          {productResults.length > 0 && (
            <div className="list-group mb-2">
              {productResults.map((p) => (
                <button key={p.productId} type="button" className="list-group-item list-group-item-action d-flex justify-content-between" onClick={() => addProduct(p)}>
                  <span>{p.productName} <small className="text-secondary">· stock {p.stockQuantity ?? 0}</small></span>
                  <strong>{Number(p.sellingPrice || 0).toFixed(2)}</strong>
                </button>
              ))}
            </div>
          )}
          <table className="table mb-0" style={{ tableLayout: 'fixed', width: '100%' }}>
            {productLines.length > 0 && (
              <thead><tr><th>Product</th><th style={{ width: 80 }}>Qty</th><th style={{ width: 120 }}>Rate</th><th style={{ width: 100 }} className="text-end">Amount</th><th style={{ width: 48 }} /></tr></thead>
            )}
            <tbody>
              {productLines.length === 0 && <tr><td className="text-center text-muted py-3">No products added.</td></tr>}
              {productLines.map((l, idx) => (
                <tr key={l.refId}>
                  <td className="align-middle">{l.name}</td>
                  <td>
                    <input type="number" min="1" aria-label={`Quantity for ${l.name}`} className="form-control form-control-sm" value={l.quantity} onChange={(e) => updateProduct(idx, { quantity: e.target.value })} />
                  </td>
                  <td>
                    <input type="number" min="0" step="0.01" aria-label={`Rate for ${l.name}`} className="form-control form-control-sm text-end" value={l.unitPrice} onChange={(e) => updateProduct(idx, { unitPrice: e.target.value })} />
                  </td>
                  <td className="align-middle text-end">{(Number(l.unitPrice || 0) * Number(l.quantity || 0)).toFixed(2)}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-danger" aria-label={`Remove ${l.name}`} onClick={() => setProductLines((prev) => prev.filter((_, i) => i !== idx))}><FiTrash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="col-lg-4">
        {/* Discount */}
        <div className="erp-card p-3 mb-3">
          <h6 className="mb-3">Offers &amp; Discount</h6>
          <OfferList
            checks={offerChecks}
            appliedCode={appliedCode}
            onApply={applyOffer}
            onRemove={removeOffer}
          />

          <label className="form-label small mt-3" htmlFor="jc-coupon">Have a coupon code?</label>
          <div className="input-group input-group-sm mb-1">
            <input
              id="jc-coupon"
              className="form-control text-uppercase"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyTypedCoupon(); }}
              placeholder="e.g. OPENINGOFFER2026"
            />
            <button className="btn btn-outline-primary" onClick={applyTypedCoupon} disabled={checkingCoupon}>
              {checkingCoupon ? 'Checking...' : 'Apply'}
            </button>
          </div>

          <div className="d-flex justify-content-between small mt-3">
            <span>Offer Discount</span>
            <span className="text-success">{couponDiscount > 0 ? `− ${couponDiscount.toFixed(2)}` : '—'}</span>
          </div>
          <label className="form-label small mt-2" htmlFor="jc-discount">Extra Discount (manual)</label>
          <input
            id="jc-discount"
            type="number"
            min="0"
            step="0.01"
            className="form-control form-control-sm"
            value={extraDiscount}
            onChange={(e) => setExtraDiscount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Totals */}
        <div className="erp-card p-3 mb-3">
          <h6 className="mb-3">Total</h6>
          <div className="d-flex justify-content-between"><span>Service Total</span><span>{totals.serviceSubtotal.toFixed(2)}</span></div>
          <div className="d-flex justify-content-between"><span>Product Total</span><span>{totals.productSubtotal.toFixed(2)}</span></div>
          {totals.taxAmount > 0 && (
            <div className="d-flex justify-content-between"><span>GST</span><span>{totals.taxAmount.toFixed(2)}</span></div>
          )}
          <div className="d-flex justify-content-between text-success"><span>Discount Applied</span><span>− {discountAmount.toFixed(2)}</span></div>
          <hr className="my-2" />
          <button
            type="button"
            className="btn w-100 d-flex justify-content-between align-items-center p-2 rounded"
            style={{ background: 'var(--erp-primary-light, #fff7e0)', border: '1px solid var(--erp-primary)' }}
            onClick={() => setShowBreakdown((v) => !v)}
            aria-expanded={showBreakdown}
          >
            <strong>Final Payable</strong>
            <span className="d-flex align-items-center gap-1">
              <strong className="fs-4 text-primary">{totals.grandTotal.toFixed(2)}</strong>
              {showBreakdown ? <FiChevronUp /> : <FiChevronDown />}
            </span>
          </button>
          {showBreakdown && (
            <ul className="list-unstyled small mt-2 mb-0">
              {serviceLines.map((l) => (
                <li key={`s-${l.refId}`} className="d-flex justify-content-between"><span>{l.name}</span><span>{Number(l.unitPrice || 0).toFixed(2)}</span></li>
              ))}
              {productLines.map((l) => (
                <li key={`p-${l.refId}`} className="d-flex justify-content-between">
                  <span>{l.name} × {l.quantity}</span><span>{(Number(l.unitPrice || 0) * Number(l.quantity || 0)).toFixed(2)}</span>
                </li>
              ))}
              {totals.taxAmount > 0 && <li className="d-flex justify-content-between text-secondary"><span>CGST + SGST</span><span>{totals.taxAmount.toFixed(2)}</span></li>}
              {couponDiscount > 0 && <li className="d-flex justify-content-between text-success"><span>Offer ({appliedCheck.offer.offerName} · {appliedCode})</span><span>− {couponDiscount.toFixed(2)}</span></li>}
              {manualDiscount > 0 && <li className="d-flex justify-content-between text-success"><span>Extra discount</span><span>− {manualDiscount.toFixed(2)}</span></li>}
              {serviceLines.length + productLines.length === 0 && <li className="text-secondary">Nothing added yet.</li>}
            </ul>
          )}
          <button className="btn btn-primary w-100 mt-3 d-flex align-items-center justify-content-center gap-2" onClick={openPayment} disabled={cancelled}>
            <FiCreditCard /> Payment
          </button>
          {cancelled && <div className="small text-danger mt-2">This job card is cancelled and can&apos;t be billed.</div>}
        </div>
      </div>

      <Modal
        show={showPayment}
        title="Payment"
        onClose={() => !paying && setShowPayment(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowPayment(false)} disabled={paying}>Cancel</button>
            <button className="btn btn-success d-flex align-items-center gap-1" onClick={markPaid} disabled={paying || !paymentMethod}>
              <FiCheckCircle /> {paying ? 'Saving...' : 'Paid'}
            </button>
          </>
        }
      >
        <div className="text-center mb-3">
          <div className="text-secondary small">Amount to collect</div>
          <div className="fs-3 fw-bold text-primary">{totals.grandTotal.toFixed(2)}</div>
          {couponDiscount > 0 && (
            <div className="small text-success">
              Includes {appliedCheck.offer.offerName} ({appliedCode}) − {couponDiscount.toFixed(2)}
            </div>
          )}
        </div>
        <div className="row g-2" role="radiogroup" aria-label="Payment method">
          {PAYMENT_METHODS.map((m) => (
            <div className="col-6" key={m.value}>
              <button
                type="button"
                role="radio"
                aria-checked={paymentMethod === m.value}
                className={`btn w-100 py-3 ${paymentMethod === m.value ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setPaymentMethod(m.value)}
              >
                {m.label}
              </button>
            </div>
          ))}
        </div>
        <p className="small text-secondary mt-3 mb-0">
          Paid saves the complaint, technician, services, products, discount and payment method to a new invoice.
        </p>
      </Modal>
    </div>
  );
}

/* ---------------- After payment ---------------- */
function PaidInvoice({ jobCard, onSaved }) {
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    invoicesService.getById(jobCard.invoiceId).then(setInvoice);
  }, [jobCard.invoiceId]);

  if (!invoice) return <Loader label="Loading invoice..." />;

  const methodLabel = PAYMENT_METHODS.find((m) => m.value === invoice.paymentMethod)?.label || invoice.paymentMethod;

  return (
    <div className="row g-3">
      <div className="col-lg-7">
        <div className="erp-card p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <div className="fw-bold">{invoice.invoiceNumber}</div>
              <span className={`badge ${invoice.paymentStatus === 'PAID' ? 'bg-success' : invoice.paymentStatus === 'PARTIAL' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                {invoice.paymentStatus}
              </span>
              {methodLabel && <span className="small text-secondary ms-2">via {methodLabel}</span>}
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" onClick={() => downloadInvoicePdf(invoice)}>
                <FiDownload size={13} /> PDF
              </button>
              <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/invoices?invoiceId=${invoice.invoiceId}`)}>View Invoice</button>
            </div>
          </div>
          {jobCard.complaint && <div className="small mb-1"><strong>Complaint:</strong> {jobCard.complaint}</div>}
          {jobCard.technicianName && <div className="small mb-1"><strong>Technician:</strong> {jobCard.technicianName}</div>}
          {jobCard.expectedDelivery && <div className="small mb-2"><strong>Expected Delivery:</strong> {dayjs(jobCard.expectedDelivery).format('DD MMM YYYY')}</div>}
          <table className="table table-sm mb-2">
            <tbody>
              {(invoice.items || []).map((l) => (
                <tr key={l.invoiceItemId}>
                  <td><span className={`badge ${l.itemType === 'SERVICE' ? 'erp-badge-service' : 'erp-badge-product'}`}>{l.itemType === 'SERVICE' ? 'Service' : 'Product'}</span></td>
                  <td>{l.description || l.itemName}{l.itemType !== 'SERVICE' && ` × ${Number(l.quantity)}`}</td>
                  <td className="text-end">{Number(l.totalAmount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="d-flex justify-content-between"><span>Service Total</span><span>{Number(invoice.serviceSubtotal ?? 0).toFixed(2)}</span></div>
          <div className="d-flex justify-content-between"><span>Product Total</span><span>{Number(invoice.productSubtotal ?? 0).toFixed(2)}</span></div>
          <div className="d-flex justify-content-between"><span>GST</span><span>{(Number(invoice.cgstAmount ?? 0) + Number(invoice.sgstAmount ?? 0)).toFixed(2)}</span></div>
          {invoice.couponCode && (
            <div className="d-flex justify-content-between text-success">
              <span>Offer: {invoice.offerName} ({invoice.couponCode}) · {offerLabel({ discountType: invoice.offerDiscountType, discountValue: invoice.offerDiscountValue })}</span>
              <span>− {Number(invoice.offerDiscountAmount ?? 0).toFixed(2)}</span>
            </div>
          )}
          <div className="d-flex justify-content-between"><span>Discount Applied</span><span>− {Number(invoice.discountAmount ?? 0).toFixed(2)}</span></div>
          <div className="d-flex justify-content-between"><strong>Grand Total</strong><strong>{Number(invoice.grandTotal).toFixed(2)}</strong></div>
          <div className="d-flex justify-content-between"><span>Paid</span><span>{Number(invoice.paidAmount).toFixed(2)}</span></div>
          <div className="d-flex justify-content-between"><span>Balance</span><span>{Number(invoice.balanceAmount).toFixed(2)}</span></div>
        </div>
      </div>
      <div className="col-lg-5">
        {(jobCard.status === 'READY_FOR_DELIVERY' || jobCard.status === 'DELIVERED') && (
          <div className="erp-card p-3">
            <DeliveryChecklist jobCard={jobCard} invoice={invoice} onDelivered={onSaved} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Delivery Checklist ----------------
 * Invoice generated / payment status come from the invoice itself — shown, not re-asked.
 * Vehicle cleaning, customer
 * belongings, and keys have no other source of truth, so the server requires them explicitly
 * (see JobCardServiceImpl.markDelivered) — this is enforcement, not just a UI nicety.
 */
function DeliveryChecklist({ jobCard, invoice, onDelivered }) {
  const [users, setUsers] = useState([]);
  // GET /api/users is SUPER_ADMIN-only on the backend, but any staff member with access to a
  // job card can be the one physically handing the vehicle back — a MANAGER hitting this screen
  // silently got an empty, permanently-unusable dropdown before this flag existed (the fetch
  // rejected with no .catch, so "Delivered By" just never populated and Confirm Delivery could
  // never be enabled). Surfacing it honestly here so it's at least diagnosable; the real fix is
  // a backend endpoint this role can call — see the QA report.
  const [staffListUnavailable, setStaffListUnavailable] = useState(false);
  const [deliveredByUserId, setDeliveredByUserId] = useState('');
  const [vehicleCleaned, setVehicleCleaned] = useState(false);
  const [belongingsChecked, setBelongingsChecked] = useState(false);
  const [keysReady, setKeysReady] = useState(false);
  const [delivering, setDelivering] = useState(false);

  useEffect(() => {
    usersService.getAll(undefined, { skipErrorToast: true })
      .then((data) => setUsers(asList(data)))
      .catch(() => setStaffListUnavailable(true));
  }, [jobCard.jobCardId]);

  const delivered = jobCard.status === 'DELIVERED';
  const canConfirm = deliveredByUserId && vehicleCleaned && belongingsChecked && keysReady;

  const checklistItems = [
    { label: 'Invoice generated', done: Boolean(invoice), note: invoice?.invoiceNumber },
    {
      label: 'Payment status',
      done: invoice?.paymentStatus === 'PAID',
      note: invoice?.paymentStatus,
      warnOnly: true,
    },
  ];

  const confirmDelivery = async () => {
    setDelivering(true);
    try {
      await jobCardsService.deliver(jobCard.jobCardId, {
        deliveredByUserId: Number(deliveredByUserId),
        vehicleCleaned,
        belongingsChecked,
        keysReady,
      });
      toast.success('Vehicle marked as delivered');
      onDelivered?.();
    } catch {
      // toast already shown
    } finally {
      setDelivering(false);
    }
  };

  return (
    <div>
      <h6 className="mb-2">{delivered ? 'Delivery Checklist' : 'Before Delivery'}</h6>
      <ul className="list-unstyled small mb-3">
        {checklistItems.map((item) => (
          <li key={item.label} className="d-flex align-items-center gap-2 mb-1">
            <FiCheck size={14} className={item.done ? 'text-success' : item.warnOnly ? 'text-warning' : 'text-danger'} style={{ opacity: item.done ? 1 : 0.35 }} />
            <span>{item.label}</span>
            {item.note && <span className="text-secondary">— {item.note}</span>}
          </li>
        ))}
      </ul>

      {delivered ? (
        <>
          <div className="small text-secondary mb-2">
            Delivered {jobCard.deliveredAt && `on ${dayjs(jobCard.deliveredAt).format('DD MMM YYYY, HH:mm')}`}
            {jobCard.deliveredByName && ` by ${jobCard.deliveredByName}`}. Vehicle cleaned, belongings checked, keys handed over.
          </div>
          <ReviewRequest jobCard={jobCard} />
        </>
      ) : (
        <>
          <div className="form-check mb-1">
            <input className="form-check-input" type="checkbox" id="dc-clean" checked={vehicleCleaned} onChange={(e) => setVehicleCleaned(e.target.checked)} />
            <label className="form-check-label" htmlFor="dc-clean">Vehicle cleaning done</label>
          </div>
          <div className="form-check mb-1">
            <input className="form-check-input" type="checkbox" id="dc-belongings" checked={belongingsChecked} onChange={(e) => setBelongingsChecked(e.target.checked)} />
            <label className="form-check-label" htmlFor="dc-belongings">Customer belongings checked</label>
          </div>
          <div className="form-check mb-2">
            <input className="form-check-input" type="checkbox" id="dc-keys" checked={keysReady} onChange={(e) => setKeysReady(e.target.checked)} />
            <label className="form-check-label" htmlFor="dc-keys">Keys ready</label>
          </div>
          <div className="mb-2" style={{ maxWidth: 280 }}>
            <label className="form-label small text-secondary">Delivered By</label>
            <select className="form-select form-select-sm" value={deliveredByUserId} onChange={(e) => setDeliveredByUserId(e.target.value)} disabled={staffListUnavailable}>
              <option value="">Select staff member...</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
            </select>
            {staffListUnavailable && (
              <div className="small text-danger mt-1">
                Staff list couldn&apos;t be loaded for your role — ask a Super Admin to complete delivery, or to grant staff-list access to this role.
              </div>
            )}
          </div>
          <button className="btn btn-success d-flex align-items-center gap-1" onClick={confirmDelivery} disabled={!canConfirm || delivering}>
            <FiTruck size={14} /> {delivering ? 'Confirming...' : 'Confirm Delivery'}
          </button>
        </>
      )}
    </div>
  );
}

/* ---------------- Review Request ----------------
 * Post-delivery: ask the customer for a review (same honest WhatsApp/SMS abstraction as Phase 5
 * — no provider is configured, so this reports NOT_CONFIGURED rather than pretending it sent),
 * or jump to the Reviews page pre-filled with this job to record feedback given by phone/in person.
 */
function ReviewRequest({ jobCard }) {
  const navigate = useNavigate();
  const [sending, setSending] = useState(null);

  const send = async (channel) => {
    setSending(channel);
    try {
      const recipientPhone = channel === 'WHATSAPP' ? (jobCard.customerWhatsapp || jobCard.customerPhone) : jobCard.customerPhone;
      const message = `Hi ${jobCard.customerName || ''}, thank you for servicing your ${jobCard.vehicleModel || 'vehicle'} with us! We'd love to hear how we did — please reply with a rating out of 5 and any comments.`;
      const log = await notificationsService.send({
        channel, recipientPhone, referenceType: 'REVIEW_REQUEST', referenceId: jobCard.jobCardId,
        subject: `Review request — ${jobCard.jobCardNumber}`, message,
      });
      const channelLabel = channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS';
      if (log.status === 'NOT_CONFIGURED') toast(`${channelLabel} isn't configured on the server yet`, { icon: '⚠️' });
      else if (log.status === 'FAILED') toast.error(log.errorMessage || `${channelLabel} send failed`);
      else toast.success(`${channelLabel} sent`);
    } catch {
      toast.error('Could not reach the server — please try again');
    } finally {
      setSending(null);
    }
  };

  const recordReview = () => {
    navigate('/reviews', {
      state: {
        customerId: jobCard.customerId,
        vehicleId: jobCard.vehicleId,
        jobCardId: jobCard.jobCardId,
        invoiceId: jobCard.invoiceId,
      },
    });
  };

  return (
    <div className="d-flex flex-wrap gap-2">
      <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={() => send('WHATSAPP')} disabled={sending === 'WHATSAPP'}>
        <FiMessageCircle size={13} /> {sending === 'WHATSAPP' ? 'Sending...' : 'Send Review Request (WhatsApp)'}
      </button>
      <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={() => send('SMS')} disabled={sending === 'SMS'}>
        <FiMessageSquare size={13} /> {sending === 'SMS' ? 'Sending...' : 'Send Review Request (SMS)'}
      </button>
      <button type="button" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" onClick={recordReview}>
        <FiStar size={13} /> Record Review
      </button>
    </div>
  );
}
