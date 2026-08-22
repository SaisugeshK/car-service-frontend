import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { FiSend, FiMessageCircle, FiMessageSquare } from 'react-icons/fi';
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
  const [campaignFor, setCampaignFor] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoadError(false);
    categoriesService.getAll().then((data) => setCategories(asList(data))).catch(() => setLoadError(true));
  };

  useEffect(load, []);

  if (loadError) return <ErrorPage message="Could not load offers. Check your connection and try again." onRetry={load} />;
  if (!categories) return <Loader label="Loading offers..." />;

  const config = {
    title: 'Offers & Promotions',
    entityName: 'Offer',
    service: offersService,
    searchKeys: ['offerName', 'description'],
    defaultValues: {
      offerName: '', description: '', discountType: 'PERCENTAGE', discountValue: '',
      startDate: '', endDate: '', vehicleType: '', categoryId: '', minimumBillAmount: '', terms: '', status: 'ACTIVE',
    },
    schema: offerSchema,
    segments: [
      { value: 'ALL', label: 'All' },
      { value: 'ACTIVE', label: 'Active', predicate: (row) => row.status === 'ACTIVE' },
      { value: 'INACTIVE', label: 'Inactive', predicate: (row) => row.status === 'INACTIVE' },
    ],
    columns: [
      { key: 'offerName', label: 'Offer', sortable: true },
      { key: 'discount', label: 'Discount', render: discountLabel },
      { key: 'vehicleType', label: 'Vehicle', render: (row) => <span className="badge bg-secondary">{row.vehicleType || 'All'}</span> },
      {
        key: 'validity',
        label: 'Validity',
        render: (row) => (row.startDate || row.endDate)
          ? `${row.startDate ? dayjs(row.startDate).format('DD MMM') : '—'} – ${row.endDate ? dayjs(row.endDate).format('DD MMM YYYY') : '—'}`
          : '—',
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => <span className={`badge ${row.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>{row.status}</span>,
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
      { name: 'description', label: 'Description', type: 'textarea', fullWidth: true },
      {
        name: 'discountType', label: 'Discount Type', type: 'select', required: true,
        options: [
          { value: 'PERCENTAGE', label: 'Percentage' },
          { value: 'FIXED_AMOUNT', label: 'Fixed Amount' },
        ],
      },
      { name: 'discountValue', label: 'Discount Value', type: 'number', step: '0.01', required: true },
      { name: 'startDate', label: 'Start Date', type: 'date' },
      { name: 'endDate', label: 'End Date', type: 'date' },
      {
        name: 'vehicleType', label: 'Vehicle Type', type: 'select',
        options: [
          { value: '', label: 'All (Car & Bike)' },
          { value: 'CAR', label: 'Car only' },
          { value: 'BIKE', label: 'Bike only' },
        ],
      },
      {
        name: 'categoryId', label: 'Service/Category', type: 'select',
        valueKey: 'id', labelKey: 'categoryName', options: categories,
      },
      { name: 'minimumBillAmount', label: 'Minimum Bill Amount', type: 'number', step: '0.01' },
      { name: 'terms', label: 'Terms & Conditions', type: 'textarea', fullWidth: true },
      {
        name: 'status', label: 'Status', type: 'select', required: true,
        options: [
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
        ],
      },
    ],
  };

  return (
    <>
      <CrudPage config={config} />
      {campaignFor && <CampaignPanel offer={campaignFor} onClose={() => setCampaignFor(null)} />}
    </>
  );
}
