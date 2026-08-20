import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiCheckCircle,
  FiTrash2,
  FiTruck,
  FiArrowLeft,
} from 'react-icons/fi';
import jobCardsService from '../services/jobCardsService';
import inspectionItemsService from '../services/inspectionItemsService';
import estimatesService from '../services/estimatesService';
import qualityChecksService from '../services/qualityChecksService';
import invoicesService from '../services/invoicesService';
import serviceMasterService from '../services/serviceMasterService';
import productsService from '../services/productsService';
import usersService from '../services/usersService';
import { calculateInvoiceTotals } from '../utils/invoiceCalculations';
import Loader from '../components/Loader';

const STATUS_FLOW = [
  'RECEIVED', 'INSPECTION', 'ESTIMATE', 'WAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS',
  'WAITING_FOR_PARTS', 'QUALITY_CHECK', 'READY_FOR_DELIVERY', 'DELIVERED',
];
const STATUS_BADGE = {
  RECEIVED: 'bg-secondary', INSPECTION: 'bg-info text-dark', ESTIMATE: 'bg-info text-dark',
  WAITING_APPROVAL: 'bg-warning text-dark', APPROVED: 'bg-primary', IN_PROGRESS: 'bg-primary',
  WAITING_FOR_PARTS: 'bg-warning text-dark', QUALITY_CHECK: 'bg-warning text-dark',
  READY_FOR_DELIVERY: 'bg-success', DELIVERED: 'bg-success', CANCELLED: 'bg-danger',
};
const INSPECTION_CATEGORIES = [
  'Engine', 'Battery', 'Brakes', 'Tyres', 'Suspension', 'AC', 'Lights', 'Electrical', 'Fluids', 'Exterior', 'Interior',
];
const QC_ITEMS = [
  'Engine', 'Brakes', 'Lights', 'AC', 'Tyres', 'Road Test', 'Cleaning',
  'Tools Removed', 'Old Parts Removed/Returned', 'Customer Complaint Resolved',
];
const TABS = ['Overview', 'Complaint', 'Inspection', 'Estimate', 'Technician', 'Quality Check', 'Invoice'];

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

export default function JobCardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jobCard, setJobCard] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);

  const reload = () => jobCardsService.getById(id).then(setJobCard);

  useEffect(() => {
    setLoading(true);
    jobCardsService.getById(id).then((jc) => {
      setJobCard(jc);
      setLoading(false);
    });
  }, [id]);

  if (loading || !jobCard) return <Loader label="Loading job card..." />;

  const badge = STATUS_BADGE[jobCard.status] || 'bg-secondary';
  const stepIndex = STATUS_FLOW.indexOf(jobCard.status);

  return (
    <div>
      <div className="erp-page-header">
        <div>
          <button className="btn btn-light border-0 p-1 mb-1" onClick={() => navigate('/job-cards')}>
            <FiArrowLeft size={14} /> All Job Cards
          </button>
          <h1 className="erp-page-title">
            {jobCard.jobCardNumber} <span className={`badge ${badge} ms-2`}>{jobCard.status}</span>
          </h1>
          <div className="text-secondary small">
            {jobCard.customerName} · {jobCard.vehicleModel} · {jobCard.registrationNumber}
          </div>
        </div>
      </div>

      {jobCard.status !== 'CANCELLED' && stepIndex >= 0 && (
        <div className="erp-card p-3 mb-3 d-flex flex-wrap gap-2">
          {STATUS_FLOW.map((s, i) => (
            <span
              key={s}
              className={`badge ${i <= stepIndex ? 'bg-primary' : 'bg-secondary'}`}
              style={{ opacity: i <= stepIndex ? 1 : 0.4 }}
            >
              {i + 1}. {s.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      <ul className="nav nav-tabs mb-3">
        {TABS.map((t) => (
          <li className="nav-item" key={t}>
            <button className={`nav-link ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'Overview' && <OverviewTab jobCard={jobCard} onSaved={reload} />}
      {tab === 'Complaint' && <ComplaintTab jobCard={jobCard} onSaved={reload} />}
      {tab === 'Inspection' && <InspectionTab jobCard={jobCard} onSaved={reload} />}
      {tab === 'Estimate' && <EstimateTab jobCard={jobCard} onSaved={reload} />}
      {tab === 'Technician' && <TechnicianTab jobCard={jobCard} onSaved={reload} />}
      {tab === 'Quality Check' && <QualityCheckTab jobCard={jobCard} onSaved={reload} />}
      {tab === 'Invoice' && <InvoiceTab jobCard={jobCard} onSaved={reload} />}
    </div>
  );
}

/* ---------------- Overview ---------------- */
function OverviewTab({ jobCard, onSaved }) {
  const [expectedDelivery, setExpectedDelivery] = useState(jobCard.expectedDelivery?.slice(0, 16) || '');
  const [odometer, setOdometer] = useState(jobCard.odometer ?? '');
  const [fuelLevel, setFuelLevel] = useState(jobCard.fuelLevel || '');
  const [keysReceived, setKeysReceived] = useState(Boolean(jobCard.keysReceived));
  const [accessoriesReceived, setAccessoriesReceived] = useState(jobCard.accessoriesReceived || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await jobCardsService.update(jobCard.jobCardId, {
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery).toISOString() : null,
        odometer: odometer !== '' ? Number(odometer) : null,
        fuelLevel,
        keysReceived,
        accessoriesReceived,
      });
      toast.success('Job card updated');
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="erp-card p-3">
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Expected Delivery</label>
          <input type="datetime-local" className="form-control" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Odometer (km)</label>
          <input type="number" className="form-control" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Fuel Level</label>
          <select className="form-select" value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value)}>
            <option value="">Select...</option>
            {['Empty', '1/4', '1/2', '3/4', 'Full'].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="col-md-6 d-flex align-items-end">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="keysReceived" checked={keysReceived} onChange={(e) => setKeysReceived(e.target.checked)} />
            <label className="form-check-label" htmlFor="keysReceived">Keys Received</label>
          </div>
        </div>
        <div className="col-12">
          <label className="form-label">Accessories Received</label>
          <input className="form-control" value={accessoriesReceived} onChange={(e) => setAccessoriesReceived(e.target.value)} placeholder="e.g. Spare tyre, toolkit, charger" />
        </div>
      </div>
      <button className="btn btn-primary mt-3" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

/* ---------------- Complaint & condition ---------------- */
function ComplaintTab({ jobCard, onSaved }) {
  const [complaint, setComplaint] = useState(jobCard.complaint || '');
  const [workRequired, setWorkRequired] = useState(jobCard.workRequired || '');
  const [vehicleConditionNotes, setVehicleConditionNotes] = useState(jobCard.vehicleConditionNotes || '');
  const [internalNotes, setInternalNotes] = useState(jobCard.internalNotes || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await jobCardsService.update(jobCard.jobCardId, { complaint, workRequired, vehicleConditionNotes, internalNotes });
      toast.success('Job card updated');
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="erp-card p-3">
      <div className="mb-3">
        <label className="form-label">Customer Complaint</label>
        <textarea className="form-control" rows={2} value={complaint} onChange={(e) => setComplaint(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Work Required</label>
        <textarea className="form-control" rows={2} value={workRequired} onChange={(e) => setWorkRequired(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Vehicle Condition / Intake Notes</label>
        <textarea
          className="form-control"
          rows={3}
          value={vehicleConditionNotes}
          onChange={(e) => setVehicleConditionNotes(e.target.value)}
          placeholder="e.g. Front bumper scratch; Rear door dent; Windshield crack"
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Internal Notes</label>
        <textarea className="form-control" rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
      </div>
      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

/* ---------------- Inspection ---------------- */
function InspectionTab({ jobCard }) {
  const [items, setItems] = useState(null);

  const load = () => inspectionItemsService.getByJobCard(jobCard.jobCardId).then((data) => {
    const existing = asList(data);
    setItems(
      INSPECTION_CATEGORIES.map((category) => existing.find((i) => i.category === category) || { category, status: 'NOT_CHECKED', notes: '', recommendation: '' })
    );
  });

  useEffect(() => { load(); }, [jobCard.jobCardId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!items) return <Loader label="Loading inspection..." />;

  const update = (idx, patch) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const saveRow = async (idx) => {
    const item = items[idx];
    try {
      await inspectionItemsService.save({ jobCardId: jobCard.jobCardId, ...item });
      toast.success(`${item.category} saved`);
    } catch {
      // toast already shown
    }
  };

  const tone = { GOOD: 'bg-success', ATTENTION: 'bg-warning text-dark', URGENT: 'bg-danger', NOT_CHECKED: 'bg-secondary' };

  return (
    <div className="erp-card p-0">
      <div className="table-responsive">
        <table className="table mb-0 align-middle">
          <thead>
            <tr>
              <th>Category</th>
              <th style={{ width: 160 }}>Status</th>
              <th>Notes</th>
              <th>Recommendation</th>
              <th style={{ width: 60 }} />
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.category}>
                <td className="fw-semibold">
                  {item.category} <span className={`badge ${tone[item.status]} ms-1`}>{item.status.replace('_', ' ')}</span>
                </td>
                <td>
                  <select className="form-select form-select-sm" value={item.status} onChange={(e) => update(idx, { status: e.target.value })}>
                    {['NOT_CHECKED', 'GOOD', 'ATTENTION', 'URGENT'].map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input className="form-control form-control-sm" value={item.notes || ''} onChange={(e) => update(idx, { notes: e.target.value })} />
                </td>
                <td>
                  <input className="form-control form-control-sm" value={item.recommendation || ''} onChange={(e) => update(idx, { recommendation: e.target.value })} />
                </td>
                <td>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => saveRow(idx)}>Save</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Estimate (Services + Parts line editor) ---------------- */
function EstimateTab({ jobCard, onSaved }) {
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [estimates, setEstimates] = useState(null);
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [serviceQuery, setServiceQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const loadEstimates = () => estimatesService.getByJobCard(jobCard.jobCardId).then((data) => setEstimates(asList(data)));

  useEffect(() => {
    Promise.all([serviceMasterService.getAll(), productsService.getAll({ itemType: 'PRODUCT' })]).then(([s, p]) => {
      setServices(asList(s).filter((x) => (x.status || 'active').toLowerCase() === 'active'));
      setProducts(asList(p));
    });
    loadEstimates();
  }, [jobCard.jobCardId]); // eslint-disable-line react-hooks/exhaustive-deps

  const serviceResults = useMemo(() => {
    if (!serviceQuery.trim()) return [];
    const q = serviceQuery.toLowerCase();
    return services.filter((s) => s.serviceName?.toLowerCase().includes(q) || s.serviceCode?.toLowerCase().includes(q)).slice(0, 6);
  }, [serviceQuery, services]);

  const productResults = useMemo(() => {
    if (!productQuery.trim()) return [];
    const q = productQuery.toLowerCase();
    return products.filter((p) => p.productName?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)).slice(0, 6);
  }, [productQuery, products]);

  const addLine = (itemType, item) => {
    setCart((prev) => {
      const refId = itemType === 'SERVICE' ? item.serviceId : item.productId;
      const existing = prev.find((l) => l.itemType === itemType && l.refId === refId);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          itemType,
          refId,
          name: itemType === 'SERVICE' ? item.serviceName : item.productName,
          unitPrice: itemType === 'SERVICE' ? item.defaultPrice : item.sellingPrice,
          quantity: 1,
          discount: 0,
        },
      ];
    });
  };

  const totals = useMemo(
    () =>
      calculateInvoiceTotals(
        cart.map((l) => ({ itemType: l.itemType, unitPrice: l.unitPrice, quantity: l.quantity, discount: l.discount, taxPercentage: 0 })),
        Number(discountAmount || 0)
      ),
    [cart, discountAmount]
  );

  const saveEstimate = async () => {
    if (cart.length === 0) return toast.error('Add at least one service or product');
    setSaving(true);
    try {
      await estimatesService.create({
        jobCardId: jobCard.jobCardId,
        customerId: jobCard.customerId,
        discountAmount: Number(discountAmount || 0),
        items: cart.map((l) => ({
          itemType: l.itemType,
          serviceId: l.itemType === 'SERVICE' ? l.refId : null,
          productId: l.itemType === 'PRODUCT' ? l.refId : null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount,
        })),
      });
      toast.success('Estimate saved');
      setCart([]);
      setDiscountAmount(0);
      await jobCardsService.update(jobCard.jobCardId, { status: 'WAITING_APPROVAL' });
      loadEstimates();
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  };

  const approve = async (estimateId) => {
    await estimatesService.approve(estimateId, 'Customer');
    toast.success('Estimate approved');
    await jobCardsService.update(jobCard.jobCardId, { status: 'APPROVED' });
    loadEstimates();
    onSaved();
  };

  const reject = async (estimateId) => {
    await estimatesService.reject(estimateId);
    toast.error('Estimate rejected');
    loadEstimates();
  };

  return (
    <div className="row g-3">
      <div className="col-lg-8">
        <div className="erp-card p-3 mb-3">
          <label className="form-label">Add Service</label>
          <input className="form-control mb-2" placeholder="Search service..." value={serviceQuery} onChange={(e) => setServiceQuery(e.target.value)} />
          {serviceResults.length > 0 && (
            <div className="list-group mb-2">
              {serviceResults.map((s) => (
                <button key={s.serviceId} type="button" className="list-group-item list-group-item-action d-flex justify-content-between" onClick={() => { addLine('SERVICE', s); setServiceQuery(''); }}>
                  {s.serviceName} <strong>{Number(s.defaultPrice || 0).toFixed(2)}</strong>
                </button>
              ))}
            </div>
          )}
          <label className="form-label">Add Product</label>
          <input className="form-control" placeholder="Search product..." value={productQuery} onChange={(e) => setProductQuery(e.target.value)} />
          {productResults.length > 0 && (
            <div className="list-group mt-2">
              {productResults.map((p) => (
                <button key={p.productId} type="button" className="list-group-item list-group-item-action d-flex justify-content-between" onClick={() => { addLine('PRODUCT', p); setProductQuery(''); }}>
                  {p.productName} <strong>{Number(p.sellingPrice || 0).toFixed(2)}</strong>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="erp-card p-0">
          <table className="table mb-0">
            <thead><tr><th>Type</th><th>Item</th><th>Qty</th><th>Rate</th><th>Discount</th><th>Amount</th><th /></tr></thead>
            <tbody>
              {cart.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-3">No lines yet — search above to add.</td></tr>}
              {cart.map((l, idx) => (
                <tr key={idx}>
                  <td><span className={`badge ${l.itemType === 'SERVICE' ? 'erp-badge-service' : 'erp-badge-product'}`}>{l.itemType === 'SERVICE' ? 'Service' : 'Product'}</span></td>
                  <td>{l.name}</td>
                  <td style={{ width: 80 }}>
                    <input type="number" min="1" className="form-control form-control-sm" value={l.quantity} onChange={(e) => setCart((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) || 1 } : x)))} />
                  </td>
                  <td>{Number(l.unitPrice).toFixed(2)}</td>
                  <td style={{ width: 100 }}>
                    <input type="number" min="0" className="form-control form-control-sm" value={l.discount} onChange={(e) => setCart((prev) => prev.map((x, i) => (i === idx ? { ...x, discount: Number(e.target.value) || 0 } : x)))} />
                  </td>
                  <td>{(l.unitPrice * l.quantity - l.discount).toFixed(2)}</td>
                  <td><button className="btn btn-sm btn-outline-danger" onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}><FiTrash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="col-lg-4">
        <div className="erp-card p-3 mb-3">
          <h6>New Estimate</h6>
          <div className="d-flex justify-content-between"><span>Service Subtotal</span><span>{totals.serviceSubtotal.toFixed(2)}</span></div>
          <div className="d-flex justify-content-between"><span>Product Subtotal</span><span>{totals.productSubtotal.toFixed(2)}</span></div>
          <div className="mb-2 mt-2">
            <label className="form-label small">Additional Discount</label>
            <input type="number" min="0" className="form-control form-control-sm" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
          </div>
          <hr />
          <div className="d-flex justify-content-between mb-2"><strong>Estimated Total</strong><strong>{totals.grandTotal.toFixed(2)}</strong></div>
          <button className="btn btn-primary w-100" onClick={saveEstimate} disabled={saving}>
            {saving ? 'Saving...' : 'Save Estimate'}
          </button>
        </div>

        {estimates && estimates.length > 0 && (
          <div className="erp-card p-3">
            <h6>Estimate History</h6>
            {estimates.map((e) => (
              <div key={e.estimateId} className="border-bottom pb-2 mb-2">
                <div className="d-flex justify-content-between">
                  <span className="small text-secondary">{e.estimateNumber}</span>
                  <span className={`badge ${e.status === 'APPROVED' ? 'bg-success' : e.status === 'REJECTED' ? 'bg-danger' : 'bg-warning text-dark'}`}>{e.status}</span>
                </div>
                <div className="fw-semibold">{Number(e.grandTotal).toFixed(2)}</div>
                {e.status === 'PENDING' && (
                  <div className="d-flex gap-2 mt-1">
                    <button className="btn btn-sm btn-success" onClick={() => approve(e.estimateId)}>Approve</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => reject(e.estimateId)}>Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Technician ---------------- */
function TechnicianTab({ jobCard, onSaved }) {
  const [users, setUsers] = useState([]);
  const [advisorUserId, setAdvisorUserId] = useState(jobCard.advisorUserId || '');
  const [technicianUserId, setTechnicianUserId] = useState(jobCard.technicianUserId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { usersService.getAll().then((data) => setUsers(asList(data))); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await jobCardsService.update(jobCard.jobCardId, {
        advisorUserId: advisorUserId ? Number(advisorUserId) : null,
        technicianUserId: technicianUserId ? Number(technicianUserId) : null,
        status: jobCard.status === 'APPROVED' ? 'IN_PROGRESS' : undefined,
      });
      toast.success('Assignment saved');
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="erp-card p-3" style={{ maxWidth: 480 }}>
      <div className="mb-3">
        <label className="form-label">Service Advisor</label>
        <select className="form-select" value={advisorUserId} onChange={(e) => setAdvisorUserId(e.target.value)}>
          <option value="">Unassigned</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Technician</label>
        <select className="form-select" value={technicianUserId} onChange={(e) => setTechnicianUserId(e.target.value)}>
          <option value="">Unassigned</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
        </select>
      </div>
      <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Assignment'}</button>
    </div>
  );
}

/* ---------------- Quality Check ---------------- */
function QualityCheckTab({ jobCard, onSaved }) {
  const [checks, setChecks] = useState(null);
  const [checklist, setChecklist] = useState(() => Object.fromEntries(QC_ITEMS.map((i) => [i, false])));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => qualityChecksService.getByJobCard(jobCard.jobCardId).then((data) => setChecks(asList(data)));
  useEffect(() => { load(); }, [jobCard.jobCardId]); // eslint-disable-line react-hooks/exhaustive-deps

  const record = async (result) => {
    setSaving(true);
    try {
      await qualityChecksService.create({
        jobCardId: jobCard.jobCardId,
        checklistJson: JSON.stringify(checklist),
        result,
        notes,
      });
      toast[result === 'PASS' ? 'success' : 'error'](`Quality check ${result === 'PASS' ? 'passed' : 'failed'}`);
      setNotes('');
      load();
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="row g-3">
      <div className="col-lg-7">
        <div className="erp-card p-3">
          <h6 className="mb-3">Checklist</h6>
          {QC_ITEMS.map((item) => (
            <div className="form-check" key={item}>
              <input
                className="form-check-input"
                type="checkbox"
                id={`qc-${item}`}
                checked={checklist[item]}
                onChange={(e) => setChecklist((prev) => ({ ...prev, [item]: e.target.checked }))}
              />
              <label className="form-check-label" htmlFor={`qc-${item}`}>{item}</label>
            </div>
          ))}
          <div className="mt-3 mb-3">
            <label className="form-label">Notes</label>
            <textarea className="form-control" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-success d-flex align-items-center gap-1" onClick={() => record('PASS')} disabled={saving}>
              <FiCheckCircle size={14} /> Pass
            </button>
            <button className="btn btn-outline-danger" onClick={() => record('FAIL')} disabled={saving}>Fail (back to In Progress)</button>
          </div>
        </div>
      </div>
      <div className="col-lg-5">
        <div className="erp-card p-3">
          <h6>History</h6>
          {(!checks || checks.length === 0) && <p className="text-muted small">No checks recorded yet.</p>}
          {checks && checks.map((c) => (
            <div key={c.qualityCheckId} className="border-bottom pb-2 mb-2 d-flex justify-content-between">
              <span className="small text-secondary">{new Date(c.checkedAt).toLocaleString()}</span>
              <span className={`badge ${c.result === 'PASS' ? 'bg-success' : 'bg-danger'}`}>{c.result}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Invoice ---------------- */
function InvoiceTab({ jobCard, onSaved }) {
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [delivering, setDelivering] = useState(false);

  useEffect(() => {
    if (jobCard.invoiceId) {
      invoicesService.getById(jobCard.invoiceId).then((inv) => { setInvoice(inv); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [jobCard.invoiceId]);

  const generateInvoice = async () => {
    setGenerating(true);
    try {
      const inv = await jobCardsService.generateInvoice(jobCard.jobCardId, { paymentMethod, paidAmount: Number(paidAmount || 0) });
      toast.success(`Invoice ${inv.invoiceNumber} generated`);
      setInvoice(inv);
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setGenerating(false);
    }
  };

  const deliver = async () => {
    setDelivering(true);
    try {
      await jobCardsService.deliver(jobCard.jobCardId);
      toast.success('Vehicle marked as delivered');
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setDelivering(false);
    }
  };

  if (loading) return <Loader label="Loading invoice..." />;

  if (!invoice) {
    return (
      <div className="erp-card p-3" style={{ maxWidth: 420 }}>
        <p className="text-secondary small">No invoice yet — generated from the latest approved estimate.</p>
        <div className="mb-3">
          <label className="form-label">Payment Method</label>
          <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Paid Amount</label>
          <input type="number" min="0" className="form-control" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={generateInvoice} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Invoice'}
        </button>
      </div>
    );
  }

  return (
    <div className="erp-card p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="fw-bold">{invoice.invoiceNumber}</div>
          <span className={`badge ${invoice.paymentStatus === 'PAID' ? 'bg-success' : invoice.paymentStatus === 'PARTIAL' ? 'bg-warning text-dark' : 'bg-danger'}`}>
            {invoice.paymentStatus}
          </span>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-primary" onClick={() => navigate('/invoices')}>View Invoices</button>
          {jobCard.status === 'READY_FOR_DELIVERY' && (
            <button className="btn btn-sm btn-success d-flex align-items-center gap-1" onClick={deliver} disabled={delivering}>
              <FiTruck size={13} /> {delivering ? 'Delivering...' : 'Mark Delivered'}
            </button>
          )}
        </div>
      </div>
      <div className="d-flex justify-content-between"><span>Service Subtotal</span><span>{Number(invoice.serviceSubtotal).toFixed(2)}</span></div>
      <div className="d-flex justify-content-between"><span>Product Subtotal</span><span>{Number(invoice.productSubtotal).toFixed(2)}</span></div>
      <div className="d-flex justify-content-between"><span>CGST</span><span>{Number(invoice.cgstAmount).toFixed(2)}</span></div>
      <div className="d-flex justify-content-between"><span>SGST</span><span>{Number(invoice.sgstAmount).toFixed(2)}</span></div>
      <div className="d-flex justify-content-between"><strong>Grand Total</strong><strong>{Number(invoice.grandTotal).toFixed(2)}</strong></div>
      <div className="d-flex justify-content-between"><span>Paid</span><span>{Number(invoice.paidAmount).toFixed(2)}</span></div>
      <div className="d-flex justify-content-between"><span>Balance</span><span>{Number(invoice.balanceAmount).toFixed(2)}</span></div>
    </div>
  );
}
