import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { FiSend, FiMessageCircle, FiMessageSquare, FiCopy } from 'react-icons/fi';
import CrudPage from './CrudPage';
import offersService from '../services/offersService';
import categoriesService from '../services/categoriesService';
import { offerSchema } from '../utils/validationSchemas';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

function discountLabel(row) {
  return row.discountType === 'PERCENTAGE' ? `${row.discountValue}% off` : `₹${row.discountValue} off`;
}

// Worked out by the server from the dates at request time — see OfferServiceImpl.lifecycleStatus.
const LIFECYCLE_META = {
  ACTIVE: { label: 'Active', badge: 'bg-success' },
  UPCOMING: { label: 'Upcoming', badge: 'bg-info text-dark' },
  EXPIRED: { label: 'Expired', badge: 'bg-danger' },
  LIMIT_REACHED: { label: 'Limit Reached', badge: 'bg-warning text-dark' },
  INACTIVE: { label: 'Disabled', badge: 'bg-secondary' },
};

const fmtDateTime = (v) => (v ? dayjs(v).format('DD MMM YYYY, hh:mm A') : null);
// <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm"; the API speaks ISO with offset.
const toLocalInput = (v) => (v ? dayjs(v).format('YYYY-MM-DDTHH:mm') : '');
const toIso = (v) => (v ? dayjs(v).format() : null);

function OfferAlerts({ offers }) {
  const endingSoon = offers.filter((o) => o.endingSoon);
  const upcoming = offers.filter((o) => o.lifecycleStatus === 'UPCOMING');
  // "Offer has ended" — only ones that ended in the last 3 days, so old offers don't nag forever.
  const justEnded = offers.filter((o) => o.lifecycleStatus === 'EXPIRED' && o.endDateTime && dayjs().diff(dayjs(o.endDateTime), 'day') < 3);
  if (endingSoon.length + upcoming.length + justEnded.length === 0) return null;
  return (
    <div className="d-flex flex-column gap-2 mb-3">
      {endingSoon.map((o) => (
        <div key={`soon-${o.offerId}`} className="alert alert-warning py-2 mb-0 small">
          ⏰ <strong>{o.offerName}</strong> ({o.couponCode}) is ending soon — ends {fmtDateTime(o.endDateTime)}.
        </div>
      ))}
      {justEnded.map((o) => (
        <div key={`ended-${o.offerId}`} className="alert alert-secondary py-2 mb-0 small">
          <strong>{o.offerName}</strong> ({o.couponCode}) has ended — {fmtDateTime(o.endDateTime)}.
        </div>
      ))}
      {upcoming.map((o) => (
        <div key={`up-${o.offerId}`} className="alert alert-info py-2 mb-0 small">
          <strong>{o.offerName}</strong> ({o.couponCode}) will start on {fmtDateTime(o.startDateTime)}.
        </div>
      ))}
    </div>
  );
}

function CouponCodeCell({ code }) {
  if (!code) return '—';
  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${code} copied`);
    } catch {
      toast.error('Could not copy — the browser blocked clipboard access');
    }
  };
  return (
    <button type="button" className="btn btn-sm btn-light border font-monospace d-inline-flex align-items-center gap-1" onClick={copy} title="Copy coupon code">
      {code} <FiCopy size={12} />
    </button>
  );
}

// Six honest numbers, computed live from real NotificationLog rows every time this renders —
// never a stored/fabricated "delivered" count. See OfferServiceImpl.buildStats.
function StatBox({ label, value, tone }) {
  return (
    <div className="text-center flex-fill">
      <div className={`fw-bold fs-5 ${tone || ''}`}>{value}</div>
      <div className="text-secondary" style={{ fontSize: 11 }}>{label}</div>
    </div>
  );
}

function CampaignPanel({ offer, onClose }) {
  const [campaigns, setCampaigns] = useState(null);
  const [channel, setChannel] = useState('WHATSAPP');
  const [launching, setLaunching] = useState(false);

  const load = () => offersService.getCampaigns(offer.id).then((data) => setCampaigns(asList(data)));
  useEffect(() => { load(); }, [offer.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const launch = async () => {
    setLaunching(true);
    try {
      const stats = await offersService.launch(offer.id, channel);
      if (stats.notConfigured > 0 && stats.sent === 0 && stats.delivered === 0) {
        toast(`Campaign launched — ${channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'} isn't configured on the server yet, so nothing actually went out`, { icon: '⚠️', duration: 6000 });
      } else {
        toast.success('Campaign launched');
      }
      load();
    } catch {
      // toast already shown
    } finally {
      setLaunching(false);
    }
  };

  return (
    <Modal
      show
      title={`Campaign — ${offer.offerName}`}
      size="modal-lg"
      onClose={onClose}
      footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}
    >
      <div className="erp-card p-3 mb-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <div className="fw-semibold">{discountLabel(offer)}</div>
            <div className="small text-secondary">
              {offer.vehicleType ? `${offer.vehicleType} owners only` : 'All customers'}
              {offer.minimumBillAmount ? ` · Min. bill ₹${offer.minimumBillAmount}` : ''}
            </div>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <select className="form-select form-select-sm" style={{ width: 140 }} value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
            </select>
            <button className="btn btn-sm btn-primary d-flex align-items-center gap-1" onClick={launch} disabled={launching}>
              <FiSend size={13} /> {launching ? 'Launching...' : 'Launch Campaign'}
            </button>
          </div>
        </div>
      </div>

      <h6 className="mb-2">Campaign History</h6>
      {campaigns === null ? (
        <Loader label="Loading campaigns..." />
      ) : campaigns.length === 0 ? (
        <p className="text-secondary small">Not launched yet — pick a channel above and launch it.</p>
      ) : (
        <div className="d-flex flex-column gap-2">
          {campaigns.map((c) => (
            <div key={c.offerCampaignId} className="erp-card p-3">
              <div className="d-flex justify-content-between small text-secondary mb-2">
                <span>{dayjs(c.launchedAt).format('DD MMM YYYY, HH:mm')}</span>
                <span>{c.totalCustomers} customers on file at launch</span>
              </div>
              <div className="d-flex flex-wrap">
                <StatBox label="Eligible" value={c.eligible} />
                <StatBox label="Sent" value={c.sent} tone="text-primary" />
                <StatBox label="Delivered" value={c.delivered} tone="text-success" />
                <StatBox label="Failed" value={c.failed} tone="text-danger" />
                <StatBox label="Not Configured" value={c.notConfigured} tone="text-warning" />
                <StatBox label="Pending" value={c.pending} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default function Offers() {
  const [categories, setCategories] = useState(null);
  const [offers, setOffers] = useState([]);
  const [campaignFor, setCampaignFor] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const loadOffers = () => offersService.getAll(undefined, { skipErrorToast: true }).then((data) => setOffers(asList(data))).catch(() => {});

  const load = () => {
    setLoadError(false);
    categoriesService.getAll().then((data) => setCategories(asList(data))).catch(() => setLoadError(true));
    loadOffers();
  };

  useEffect(load, []);

  if (loadError) return <ErrorPage message="Could not load offers. Check your connection and try again." onRetry={load} />;
  if (!categories) return <Loader label="Loading offers..." />;

  const config = {
    title: 'Offers & Promotions',
    entityName: 'Offer',
    service: offersService,
    searchKeys: ['offerName', 'couponCode', 'description'],
    defaultValues: {
      offerName: '', description: '', discountType: 'PERCENTAGE', discountValue: '',
      startDateTime: '', endDateTime: '', vehicleType: '', categoryId: '', minimumBillAmount: '', usageLimit: '',
      terms: '', status: 'ACTIVE',
    },
    schema: offerSchema,
    transformRow: (row) => ({
      ...row,
      startDateTime: toLocalInput(row.startDateTime),
      endDateTime: toLocalInput(row.endDateTime),
      categoryId: row.categoryId ?? '',
      minimumBillAmount: row.minimumBillAmount ?? '',
      usageLimit: row.usageLimit ?? '',
      vehicleType: row.vehicleType ?? '',
    }),
    transformPayload: (values) => ({
      offerName: values.offerName,
      description: values.description,
      discountType: values.discountType,
      discountValue: values.discountValue,
      startDateTime: toIso(values.startDateTime),
      endDateTime: toIso(values.endDateTime),
      vehicleType: values.vehicleType || null,
      categoryId: values.categoryId === '' || values.categoryId == null ? null : Number(values.categoryId),
      minimumBillAmount: values.minimumBillAmount === '' || values.minimumBillAmount == null ? null : Number(values.minimumBillAmount),
      usageLimit: values.usageLimit === '' || values.usageLimit == null ? null : Number(values.usageLimit),
      terms: values.terms,
      status: values.status,
    }),
    onAfterSave: loadOffers,
    segments: [
      { value: 'ALL', label: 'All' },
      { value: 'ACTIVE', label: 'Active', predicate: (row) => row.lifecycleStatus === 'ACTIVE' },
      { value: 'UPCOMING', label: 'Upcoming', predicate: (row) => row.lifecycleStatus === 'UPCOMING' },
      { value: 'EXPIRED', label: 'Expired', predicate: (row) => row.lifecycleStatus === 'EXPIRED' },
      { value: 'INACTIVE', label: 'Disabled', predicate: (row) => row.lifecycleStatus === 'INACTIVE' },
    ],
    columns: [
      { key: 'offerName', label: 'Offer', sortable: true },
      { key: 'couponCode', label: 'Coupon Code', render: (row) => <CouponCodeCell code={row.couponCode} /> },
      {
        key: 'discount',
        label: 'Discount',
        render: (row) => (
          <>
            {discountLabel(row)}
            {row.minimumBillAmount ? <div className="small text-secondary">Min. bill ₹{Number(row.minimumBillAmount).toFixed(2)}</div> : null}
          </>
        ),
      },
      { key: 'vehicleType', label: 'Vehicle', render: (row) => <span className="badge bg-secondary">{row.vehicleType || 'All'}</span> },
      {
        key: 'validity',
        label: 'Validity',
        render: (row) => (row.startDateTime || row.endDateTime ? (
          <div className="small">
            <div>From: {fmtDateTime(row.startDateTime) || 'anytime'}</div>
            <div>To: {fmtDateTime(row.endDateTime) || 'no end'}</div>
          </div>
        ) : 'Always'),
      },
      {
        key: 'usage',
        label: 'Used',
        render: (row) => `${row.usedCount ?? 0}${row.usageLimit ? ` / ${row.usageLimit}` : ''}`,
      },
      {
        key: 'lifecycleStatus',
        label: 'Status',
        render: (row) => {
          const meta = LIFECYCLE_META[row.lifecycleStatus] || { label: row.lifecycleStatus || row.status, badge: 'bg-secondary' };
          return (
            <>
              <span className={`badge ${meta.badge}`}>{meta.label}</span>
              {row.endingSoon && <span className="badge bg-warning text-dark ms-1">Ending soon</span>}
            </>
          );
        },
      },
      {
        key: 'campaign',
        label: 'Campaign',
        render: (row) => (
          <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" onClick={(e) => { e.stopPropagation(); setCampaignFor(row); }}>
            <FiMessageCircle size={13} /><FiMessageSquare size={13} /> Manage
          </button>
        ),
      },
    ],
    fields: [
      { name: 'offerName', label: 'Offer Name', required: true, fullWidth: true },
      {
        name: 'couponNote',
        type: 'note',
        text: (values) => (values.couponCode
          ? `Coupon code: ${values.couponCode} (fixed once created — customers may already have it)`
          : 'Coupon code is generated automatically from the offer name when you save (e.g. "Opening Offer" → OPENINGOFFER2026).'),
      },
      { name: 'description', label: 'Description', type: 'textarea', fullWidth: true },
      {
        name: 'discountType', label: 'Discount Type', type: 'select', required: true,
        options: [
          { value: 'PERCENTAGE', label: 'Percentage' },
          { value: 'FIXED_AMOUNT', label: 'Fixed Amount' },
        ],
      },
      { name: 'discountValue', label: 'Discount Value', type: 'number', step: '0.01', min: '0.01', required: true },
      { name: 'startDateTime', label: 'Start Date & Time', type: 'datetime-local' },
      { name: 'endDateTime', label: 'End Date & Time', type: 'datetime-local' },
      {
        name: 'vehicleType', label: 'Vehicle Type', type: 'select',
        options: [
          { value: '', label: 'All (Car & Bike)' },
          { value: 'CAR', label: 'Car only' },
          { value: 'BIKE', label: 'Bike only' },
        ],
      },
      {
        name: 'categoryId', label: 'Service/Category (label only)', type: 'select',
        valueKey: 'id', labelKey: 'categoryName', options: categories,
      },
      { name: 'minimumBillAmount', label: 'Minimum Bill Amount', type: 'number', step: '0.01', min: '0' },
      { name: 'usageLimit', label: 'Usage Limit (optional)', type: 'number', step: '1', min: '1', placeholder: 'Unlimited' },
      { name: 'terms', label: 'Terms & Conditions', type: 'textarea', fullWidth: true },
      {
        name: 'status', label: 'Enabled', type: 'select', required: true,
        options: [
          { value: 'ACTIVE', label: 'Enabled' },
          { value: 'INACTIVE', label: 'Disabled' },
        ],
      },
    ],
  };

  return (
    <>
      <OfferAlerts offers={offers} />
      <CrudPage config={config} />
      {campaignFor && <CampaignPanel offer={campaignFor} onClose={() => setCampaignFor(null)} />}
    </>
  );
}
