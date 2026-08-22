import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import {
  FiCheckCircle,
  FiTrash2,
  FiTruck,
  FiArrowLeft,
  FiChevronDown,
  FiChevronUp,
  FiPrinter,
  FiShare2,
  FiCamera,
  FiSave,
  FiX,
  FiDownload,
  FiCopy,
  FiMessageCircle,
  FiMessageSquare,
  FiCheck,
  FiStar,
} from 'react-icons/fi';
import jobCardsService from '../services/jobCardsService';
import inspectionItemsService from '../services/inspectionItemsService';
import estimatesService from '../services/estimatesService';
import qualityChecksService from '../services/qualityChecksService';
import invoicesService from '../services/invoicesService';
import serviceMasterService from '../services/serviceMasterService';
import productsService from '../services/productsService';
import usersService from '../services/usersService';
import notificationsService from '../services/notificationsService';
import additionalWorkService from '../services/additionalWorkService';
import inspectionPhotosService from '../services/inspectionPhotosService';
import { calculateInvoiceTotals } from '../utils/invoiceCalculations';
import { downloadEstimatePdf, shareEstimatePdf, estimateSummaryText, getCompanyDetails } from '../utils/invoicePdf';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

// ADDITIONAL_APPROVAL_REQUIRED is deliberately NOT a step here — it's a branch off IN_PROGRESS
// that always resolves back to IN_PROGRESS (approve or reject), never forward. Including it as a
// linear step would make the stepper visually regress every time additional work is resolved.
// It's surfaced instead as a banner (see below) while stepIndex treats it as still-IN_PROGRESS.
const STATUS_FLOW = [
  'RECEIVED', 'INSPECTION', 'ESTIMATE', 'WAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS',
  'WAITING_FOR_PARTS', 'QUALITY_CHECK', 'READY_FOR_DELIVERY', 'DELIVERED',
];
const STATUS_BADGE = {
  RECEIVED: 'bg-secondary', INSPECTION: 'bg-info text-dark', ESTIMATE: 'bg-info text-dark',
  WAITING_APPROVAL: 'bg-warning text-dark', APPROVED: 'bg-primary', IN_PROGRESS: 'bg-primary',
  WAITING_FOR_PARTS: 'bg-warning text-dark', ADDITIONAL_APPROVAL_REQUIRED: 'bg-warning text-dark',
  QUALITY_CHECK: 'bg-warning text-dark', READY_FOR_DELIVERY: 'bg-success', DELIVERED: 'bg-success',
  CANCELLED: 'bg-danger',
};
// Same category strings the app has always used (kept so existing inspection_items rows still
// match up) plus two additions from the full checklist spec: Safety, General Condition.
// Vehicle Information / Customer Complaints / Recommendations aren't checklist rows — the first
// two already live on the Overview/Complaint tabs, the third is the free-text rollup below.
const INSPECTION_CATEGORIES = [
  'Exterior', 'Interior', 'Engine', 'Electrical', 'Battery', 'Brakes', 'Suspension',
  'Tyres', 'AC', 'Fluids', 'Lights', 'Safety', 'General Condition',
];
const INSPECTION_CATEGORY_LABELS = { AC: 'AC / Cooling' };
const INSPECTION_STATUS_OPTIONS = [
  { value: 'GOOD', label: 'Good', tone: 'success' },
  { value: 'ATTENTION', label: 'Attention', tone: 'warning' },
  { value: 'REPAIR_REQUIRED', label: 'Repair Required', tone: 'danger' },
  { value: 'REPLACE', label: 'Replace', tone: 'danger' },
  { value: 'NOT_APPLICABLE', label: 'N/A', tone: 'secondary' },
];
// NOT_CHECKED = default/unset. URGENT is a legacy value from before this 5-state taxonomy
// existed — old rows may still carry it; it's still displayed correctly, just no longer written.
const INSPECTION_STATUS_META = {
  NOT_CHECKED: { label: 'Not Checked', tone: 'secondary' },
  URGENT: { label: 'Urgent', tone: 'danger' },
  ...Object.fromEntries(INSPECTION_STATUS_OPTIONS.map((o) => [o.value, o])),
};
const INSPECTION_PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'];

// Estimate lines are tagged with one of these so the estimate can show what the customer asked
// for separately from what the technician found and recommends — never merged into one flat list.
const WORK_CATEGORIES = [
  { value: 'CUSTOMER_REQUESTED', label: 'Customer Requested' },
  { value: 'RECOMMENDED', label: 'Recommended' },
];
const QC_ITEMS = [
  'Engine', 'Brakes', 'Lights', 'AC', 'Tyres', 'Road Test', 'Cleaning',
  'Tools Removed', 'Old Parts Removed/Returned', 'Customer Complaint Resolved',
];
const TABS = ['Overview', 'Complaint', 'Inspection', 'Estimate', 'Technician', 'Additional Work', 'Quality Check', 'Invoice'];

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

export default function JobCardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jobCard, setJobCard] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const reload = () => {
    setLoadError(false);
    jobCardsService.getById(id).then(setJobCard).catch(() => setLoadError(true));
    jobCardsService.getStatusHistory(id).then((data) => setStatusHistory(asList(data)));
  };

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    Promise.all([jobCardsService.getById(id), jobCardsService.getStatusHistory(id)])
      .then(([jc, history]) => {
        setJobCard(jc);
        setStatusHistory(asList(history));
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loadError) return <ErrorPage message="Could not load this job card. Check your connection and try again." onRetry={reload} />;
  if (loading || !jobCard) return <Loader label="Loading job card..." />;

  const badge = STATUS_BADGE[jobCard.status] || 'bg-secondary';
  const awaitingAdditionalApproval = jobCard.status === 'ADDITIONAL_APPROVAL_REQUIRED';
  // See STATUS_FLOW comment — this branch state maps back onto IN_PROGRESS for the stepper so
  // resolving it (approve or reject) never looks like the job card moved backwards.
  const stepIndex = STATUS_FLOW.indexOf(awaitingAdditionalApproval ? 'IN_PROGRESS' : jobCard.status);

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

      {awaitingAdditionalApproval && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center mb-3">
          <span>Additional work was found during service and is awaiting the customer&apos;s decision.</span>
          <button className="btn btn-sm btn-warning" onClick={() => setTab('Additional Work')}>View Additional Work</button>
        </div>
      )}

      {jobCard.status !== 'CANCELLED' && stepIndex >= 0 && (
        <div className="erp-card p-3 mb-3" style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Job card status timeline">
          <div className="d-flex align-items-start" style={{ minWidth: STATUS_FLOW.length * 108 }}>
            {STATUS_FLOW.map((s, i) => {
              const historyEntry = statusHistory.find((h) => h.status === s);
              const isDone = i < stepIndex;
              const isCurrent = i === stepIndex;
              const active = isDone || isCurrent;
              return (
                <div key={s} className="d-flex flex-column align-items-center text-center" style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                  {i > 0 && (
                    <div
                      style={{
                        position: 'absolute', top: 14, right: '50%', width: '100%', height: 2,
                        background: i <= stepIndex ? 'var(--erp-primary)' : 'var(--erp-border)', zIndex: 0,
                      }}
                    />
                  )}
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: 28, height: 28, zIndex: 1,
                      background: active ? 'var(--erp-primary)' : '#fff',
                      border: `2px solid ${active ? 'var(--erp-primary)' : 'var(--erp-border-strong)'}`,
                      color: active ? '#fff' : 'var(--erp-text-secondary)',
                    }}
                  >
                    {isDone ? <FiCheck size={14} /> : <span style={{ fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
                  </div>
                  <div className="small mt-1 px-1" style={{ fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--erp-primary)' : undefined }}>
                    {s.replace(/_/g, ' ')}
                  </div>
                  {historyEntry && (
                    <div className="text-secondary" style={{ fontSize: 10 }}>{dayjs(historyEntry.changedAt).format('DD MMM, HH:mm')}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ul className="nav nav-tabs mb-3 flex-nowrap overflow-auto">
        {TABS.map((t) => (
          <li className="nav-item text-nowrap" key={t}>
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
      {tab === 'Additional Work' && <AdditionalWorkTab jobCard={jobCard} onSaved={reload} />}
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

/* ---------------- Inspection ----------------
 * Technician-facing checklist: one accordion card per category, quick-tap status buttons instead
 * of typing, progress indicator, and Save Draft / Complete Inspection / Cancel / Print / Share.
 * Photo upload (Phase 33/34) is real — one fetch for the whole job card's photos here, filtered
 * per category below, instead of every accordion category re-fetching the same list.
 */
function InspectionTab({ jobCard, onSaved }) {
  const [items, setItems] = useState(null);
  const [openCategory, setOpenCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]);

  const loadPhotos = () => inspectionPhotosService.getByJobCard(jobCard.jobCardId).then((data) => setPhotos(asList(data))).catch(() => {});

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCard.jobCardId]);

  const load = () => inspectionItemsService.getByJobCard(jobCard.jobCardId).then((data) => {
    const existing = asList(data);
    setItems(
      INSPECTION_CATEGORIES.map((category) =>
        existing.find((i) => i.category === category) ||
        { category, status: 'NOT_CHECKED', notes: '', recommendation: '', priority: '' }
      )
    );
  });

  useEffect(() => { load(); }, [jobCard.jobCardId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!items) return <Loader label="Loading inspection..." />;

  const update = (idx, patch) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const checkedCount = items.filter((it) => it.status && it.status !== 'NOT_CHECKED').length;
  const progress = Math.round((checkedCount / items.length) * 100);

  // Only persist categories the technician actually touched — an untouched, still-NOT_CHECKED,
  // still-blank row has nothing worth writing and would just clutter the table.
  const touched = (it) => (it.status && it.status !== 'NOT_CHECKED') || it.notes || it.recommendation || it.priority;

  const saveAll = async () => {
    setSaving(true);
    try {
      const toSave = items.filter(touched);
      await Promise.all(toSave.map((item) => inspectionItemsService.save({ jobCardId: jobCard.jobCardId, ...item })));
      return true;
    } catch {
      return false; // toast already shown by the axios interceptor
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    const ok = await saveAll();
    if (ok) { toast.success('Inspection draft saved'); load(); }
  };

  const completeInspection = async () => {
    const ok = await saveAll();
    if (!ok) return;
    try {
      if (['RECEIVED', 'INSPECTION'].includes(jobCard.status)) {
        await jobCardsService.update(jobCard.jobCardId, { status: 'ESTIMATE' });
      }
      toast.success('Inspection completed');
      load();
      onSaved?.();
    } catch {
      // toast already shown
    }
  };

  const cancel = () => { load(); setOpenCategory(null); };

  const shareSupported = typeof navigator !== 'undefined' && !!navigator.share;
  const share = async () => {
    const summary = items
      .filter(touched)
      .map((it) => `${it.category}: ${INSPECTION_STATUS_META[it.status]?.label || it.status}${it.recommendation ? ` — ${it.recommendation}` : ''}`)
      .join('\n');
    try {
      await navigator.share({
        title: `Inspection — ${jobCard.jobCardNumber}`,
        text: `Inspection for ${jobCard.customerName} · ${jobCard.vehicleModel} (${jobCard.registrationNumber})\n\n${summary}`,
      });
    } catch {
      // user cancelled the share sheet — not an error
    }
  };

  return (
    <div>
      <div className="erp-card p-3 mb-3 d-flex flex-wrap align-items-center gap-3">
        <div style={{ flex: '1 1 220px', minWidth: 200 }}>
          <div className="d-flex justify-content-between small mb-1">
            <span className="fw-semibold d-flex align-items-center gap-2">
              Inspection Progress
              {jobCard.vehicleCategory && (
                <span className={`badge ${jobCard.vehicleCategory === 'BIKE' ? 'bg-info' : 'bg-secondary'}`}>
                  {jobCard.vehicleCategory}
                </span>
              )}
            </span>
            <span className="text-secondary">{progress}% ({checkedCount}/{items.length})</span>
          </div>
          <div className="progress" style={{ height: 8 }}>
            <div
              className={`progress-bar ${progress === 100 ? 'bg-success' : 'bg-primary'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2 no-print">
          <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={cancel} disabled={saving}>
            <FiX size={14} /> Cancel
          </button>
          <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" onClick={() => window.print()}>
            <FiPrinter size={14} /> Print
          </button>
          {shareSupported && (
            <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" onClick={share}>
              <FiShare2 size={14} /> Share
            </button>
          )}
          <button className="btn btn-sm btn-secondary d-flex align-items-center gap-1" onClick={saveDraft} disabled={saving}>
            <FiSave size={14} /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="btn btn-sm btn-primary d-flex align-items-center gap-1" onClick={completeInspection} disabled={saving}>
            <FiCheckCircle size={14} /> Complete Inspection
          </button>
        </div>
      </div>

      <div className="d-flex flex-column gap-2">
        {items.map((item, idx) => {
          const meta = INSPECTION_STATUS_META[item.status] || INSPECTION_STATUS_META.NOT_CHECKED;
          const isOpen = openCategory === item.category;
          return (
            <div className="erp-card p-0" key={item.category}>
              <button
                type="button"
                className="btn w-100 d-flex justify-content-between align-items-center p-3 border-0"
                style={{ background: 'transparent', textAlign: 'left' }}
                onClick={() => setOpenCategory(isOpen ? null : item.category)}
              >
                <span className="fw-semibold">{INSPECTION_CATEGORY_LABELS[item.category] || item.category}</span>
                <span className="d-flex align-items-center gap-2">
                  <span className={`badge bg-${meta.tone} ${meta.tone === 'warning' ? 'text-dark' : ''}`}>{meta.label}</span>
                  {item.priority && <span className="badge bg-dark">{item.priority}</span>}
                  {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                </span>
              </button>

              {isOpen && (
                <div className="p-3 border-top">
                  <div className="mb-3">
                    <label className="form-label small text-secondary">Status</label>
                    <div className="d-flex flex-wrap gap-2">
                      {INSPECTION_STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`btn btn-sm ${item.status === opt.value ? `btn-${opt.tone}` : `btn-outline-${opt.tone}`}`}
                          onClick={() => update(idx, { status: opt.value })}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small text-secondary">Remarks</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={item.notes || ''}
                        onChange={(e) => update(idx, { notes: e.target.value })}
                        placeholder="What did you find?"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small text-secondary">Recommendation</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        value={item.recommendation || ''}
                        onChange={(e) => update(idx, { recommendation: e.target.value })}
                        placeholder="What should be done?"
                      />
                    </div>
                  </div>
                  <div className="row g-3 align-items-end">
                    <div className="col-md-4">
                      <label className="form-label small text-secondary">Priority</label>
                      <select className="form-select form-select-sm" value={item.priority || ''} onChange={(e) => update(idx, { priority: e.target.value })}>
                        <option value="">None</option>
                        {INSPECTION_PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label small text-secondary d-flex align-items-center gap-1">
                        <FiCamera size={13} /> Photos
                      </label>
                      <CategoryPhotos
                        jobCardId={jobCard.jobCardId}
                        category={item.category}
                        photos={photos.filter((p) => p.category === item.category)}
                        onChange={loadPhotos}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The backend serves photos on the same authenticated /api/** surface as every other endpoint
// (Phase 19) — a bare <img src="/api/..."> can't carry the Bearer header, so this fetches the
// bytes through axios (which does) and renders them from an object URL instead.
function AuthedPhoto({ photoId, onRemove }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    inspectionPhotosService.getPhotoBlob(photoId).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  return (
    <div className="position-relative" style={{ width: 64, height: 64 }}>
      {src ? (
        <img src={src} alt="Inspection" className="w-100 h-100 rounded" style={{ objectFit: 'cover', border: '1px solid var(--erp-border)' }} />
      ) : (
        <div className="w-100 h-100 rounded d-flex align-items-center justify-content-center" style={{ background: 'var(--erp-bg)' }}>
          <FiCamera size={16} className="text-secondary" />
        </div>
      )}
      <button
        type="button"
        className="btn btn-sm btn-danger d-flex align-items-center justify-content-center p-0"
        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%' }}
        onClick={onRemove}
        title="Delete photo"
      >
        <FiX size={11} />
      </button>
    </div>
  );
}

function CategoryPhotos({ jobCardId, category, photos, onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await inspectionPhotosService.upload(jobCardId, category, file);
      toast.success('Photo added');
      onChange();
    } catch {
      // Global toast already shown by the axios interceptor.
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (photoId) => {
    try {
      await inspectionPhotosService.remove(photoId);
      toast.success('Photo removed');
      onChange();
    } catch {
      // Global toast already shown.
    }
  };

  return (
    <div className="border rounded p-2" style={{ background: 'var(--erp-bg)' }}>
      <div className="d-flex flex-wrap gap-2 mb-2">
        {photos.map((p) => (
          <AuthedPhoto key={p.inspectionPhotoId} photoId={p.inspectionPhotoId} onRemove={() => handleRemove(p.inspectionPhotoId)} />
        ))}
        {photos.length === 0 && <span className="small text-secondary">No photos for this category yet.</span>}
      </div>
      <label className={`btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 mb-0 ${uploading ? 'disabled' : ''}`}>
        <FiCamera size={13} /> {uploading ? 'Uploading...' : 'Add Photo'}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="d-none" onChange={handleFile} disabled={uploading} />
      </label>
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
  const [workCategory, setWorkCategory] = useState('CUSTOMER_REQUESTED');
  const [validUntil, setValidUntil] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));
  const [saving, setSaving] = useState(false);
  const [revisingEstimateId, setRevisingEstimateId] = useState(null);
  const [requestingChangesFor, setRequestingChangesFor] = useState(null);
  const [changeNotes, setChangeNotes] = useState('');

  const loadEstimates = () => estimatesService.getByJobCard(jobCard.jobCardId).then((data) => setEstimates(asList(data)));

  useEffect(() => {
    Promise.all([serviceMasterService.getAll(), productsService.getAll({ itemType: 'PRODUCT' })]).then(([s, p]) => {
      setServices(asList(s).filter((x) => (x.status || 'active').toLowerCase() === 'active'));
      setProducts(asList(p));
    });
    loadEstimates();
  }, [jobCard.jobCardId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vehicle-type applies-to-both convention: blank/null vehicleType means every vehicle,
  // so only exclude items explicitly restricted to the OTHER category.
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

  const addLine = (itemType, item) => {
    setCart((prev) => {
      const refId = itemType === 'SERVICE' ? item.serviceId : item.productId;
      // Same item under a different work category is a distinct line, not a quantity bump —
      // "customer asked for an oil change" and "technician also recommends one" are different facts.
      const existing = prev.find((l) => l.itemType === itemType && l.refId === refId && l.workCategory === workCategory);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          itemType,
          refId,
          workCategory,
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

  const resetCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setValidUntil(dayjs().add(7, 'day').format('YYYY-MM-DD'));
    setRevisingEstimateId(null);
  };

  const saveEstimate = async () => {
    if (cart.length === 0) return toast.error('Add at least one service or product');
    setSaving(true);
    try {
      const payload = {
        jobCardId: jobCard.jobCardId,
        customerId: jobCard.customerId,
        discountAmount: Number(discountAmount || 0),
        validUntil: validUntil || null,
        items: cart.map((l) => ({
          itemType: l.itemType,
          serviceId: l.itemType === 'SERVICE' ? l.refId : null,
          productId: l.itemType === 'PRODUCT' ? l.refId : null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount,
          workCategory: l.workCategory,
        })),
      };

      if (revisingEstimateId) {
        // A new row in the same revision chain — the original (now CHANGES_REQUESTED) is
        // never edited or deleted, so it stays visible in history exactly as the customer saw it.
        await estimatesService.revise(revisingEstimateId, payload);
        toast.success('Revised estimate saved');
      } else {
        await estimatesService.create(payload);
        toast.success('Estimate saved');
        await jobCardsService.update(jobCard.jobCardId, { status: 'WAITING_APPROVAL' });
      }
      resetCart();
      loadEstimates();
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  };

  // Loads an existing estimate's lines into the editor so staff can add/remove/change quantity,
  // then Save creates the next revision instead of a brand-new, unrelated estimate.
  const startRevision = (estimate) => {
    setCart(
      (estimate.items || []).map((it) => ({
        itemType: it.itemType,
        refId: it.itemType === 'SERVICE' ? it.serviceId : it.productId,
        workCategory: it.workCategory || 'RECOMMENDED',
        name: it.description || it.itemName,
        unitPrice: Number(it.unitPrice),
        quantity: Number(it.quantity),
        discount: Number(it.discount || 0),
      }))
    );
    setDiscountAmount(Number(estimate.discountAmount || 0));
    setValidUntil(estimate.validUntil || dayjs().add(7, 'day').format('YYYY-MM-DD'));
    setRevisingEstimateId(estimate.estimateId);
  };

  const submitChangeRequest = async (estimate) => {
    try {
      await estimatesService.requestChanges(estimate.estimateId, changeNotes);
      toast('Changes requested — edit the items below, then save the revision', { icon: '✏️' });
      startRevision(estimate);
      setRequestingChangesFor(null);
      setChangeNotes('');
      loadEstimates();
    } catch {
      // toast already shown
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

  const revisingEstimate = revisingEstimateId ? estimates?.find((e) => e.estimateId === revisingEstimateId) : null;

  return (
    <div className="row g-3">
      <div className="col-lg-8">
        {revisingEstimate && (
          <div className="erp-card p-3 mb-3 d-flex justify-content-between align-items-center" style={{ background: 'var(--erp-warning-light)', border: '1px solid var(--erp-warning)' }}>
            <span className="small">
              Revising <strong>{revisingEstimate.estimateNumber} REV {(revisingEstimate.revisionNumber || 1) + 1}</strong> — edit items below, then save.
            </span>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetCart}>Cancel Revision</button>
          </div>
        )}
        <div className="erp-card p-3 mb-3">
          <label className="form-label small text-secondary mb-2">Adding as</label>
          <div className="btn-group mb-3" role="group">
            {WORK_CATEGORIES.map((wc) => (
              <button
                key={wc.value}
                type="button"
                className={`btn btn-sm ${workCategory === wc.value ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setWorkCategory(wc.value)}
              >
                {wc.label}
              </button>
            ))}
          </div>
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

        {WORK_CATEGORIES.map((wc) => {
          const rows = cart
            .map((l, idx) => ({ ...l, idx }))
            .filter((l) => l.workCategory === wc.value);
          const groupTotal = rows.reduce((sum, l) => sum + (l.unitPrice * l.quantity - l.discount), 0);
          return (
            <div className="erp-card p-0 mb-3" key={wc.value}>
              <div className="p-2 px-3 fw-semibold small text-secondary text-uppercase border-bottom" style={{ letterSpacing: '0.04em' }}>
                {wc.label} Work {rows.length > 0 && <span className="text-secondary fw-normal">({groupTotal.toFixed(2)})</span>}
              </div>
              <div className="table-responsive">
                {/* table-layout: fixed + explicit widths on the narrow numeric columns — without
                    it, the browser's default auto-layout lets a long, wrapping product/service
                    name (e.g. "Engine Oil 5W-30 Synthetic 1L") steal space from the Qty column,
                    shrinking its <input> down to ~26px — narrow enough that the digit inside is
                    clipped and invisible even though the value is set correctly underneath. */}
                <table className="table mb-0" style={{ tableLayout: 'fixed', width: '100%' }}>
                  {rows.length > 0 && (
                    <thead><tr><th style={{ width: 90 }}>Type</th><th>Item</th><th style={{ width: 80 }}>Qty</th><th style={{ width: 90 }}>Rate</th><th style={{ width: 100 }}>Discount</th><th style={{ width: 100 }}>Amount</th><th style={{ width: 48 }} /></tr></thead>
                  )}
                  <tbody>
                    {rows.length === 0 && <tr><td className="text-center text-muted py-3">No {wc.label.toLowerCase()} lines yet.</td></tr>}
                    {rows.map((l) => (
                      <tr key={l.idx}>
                        <td><span className={`badge ${l.itemType === 'SERVICE' ? 'erp-badge-service' : 'erp-badge-product'}`}>{l.itemType === 'SERVICE' ? 'Service' : 'Product'}</span></td>
                        <td>{l.name}</td>
                        <td style={{ width: 80 }}>
                          <input type="number" min="1" aria-label={`Quantity for ${l.name}`} className="form-control form-control-sm" value={l.quantity} onChange={(e) => setCart((prev) => prev.map((x, i) => (i === l.idx ? { ...x, quantity: Number(e.target.value) || 1 } : x)))} />
                        </td>
                        <td>{Number(l.unitPrice).toFixed(2)}</td>
                        <td style={{ width: 100 }}>
                          <input type="number" min="0" aria-label={`Discount for ${l.name}`} className="form-control form-control-sm" value={l.discount} onChange={(e) => setCart((prev) => prev.map((x, i) => (i === l.idx ? { ...x, discount: Number(e.target.value) || 0 } : x)))} />
                        </td>
                        <td>{(l.unitPrice * l.quantity - l.discount).toFixed(2)}</td>
                        <td><button className="btn btn-sm btn-outline-danger" aria-label={`Remove ${l.name}`} onClick={() => setCart((prev) => prev.filter((_, i) => i !== l.idx))}><FiTrash2 size={13} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
      <div className="col-lg-4">
        <div className="erp-card p-3 mb-3">
          <h6>{revisingEstimate ? `Revised Estimate (REV ${(revisingEstimate.revisionNumber || 1) + 1})` : 'New Estimate'}</h6>
          <div className="d-flex justify-content-between"><span>Service Subtotal</span><span>{totals.serviceSubtotal.toFixed(2)}</span></div>
          <div className="d-flex justify-content-between"><span>Product Subtotal</span><span>{totals.productSubtotal.toFixed(2)}</span></div>
          <div className="mb-2 mt-2">
            <label className="form-label small" htmlFor="est-additionalDiscount">Additional Discount</label>
            <input id="est-additionalDiscount" type="number" min="0" className="form-control form-control-sm" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
          </div>
          <div className="mb-2">
            <label className="form-label small" htmlFor="est-validUntil">Valid Until</label>
            <input id="est-validUntil" type="date" className="form-control form-control-sm" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <hr />
          <div className="d-flex justify-content-between mb-2"><strong>Estimated Total</strong><strong>{totals.grandTotal.toFixed(2)}</strong></div>
          <button className="btn btn-primary w-100" onClick={saveEstimate} disabled={saving}>
            {saving ? 'Saving...' : revisingEstimate ? 'Save Revised Estimate' : 'Save Estimate'}
          </button>
        </div>

        {estimates && estimates.length > 0 && (
          <div className="erp-card p-3">
            <h6>Estimate History</h6>
            {estimates.map((e) => {
              const requestedCount = (e.items || []).filter((i) => i.workCategory === 'CUSTOMER_REQUESTED').length;
              const recommendedCount = (e.items || []).filter((i) => i.workCategory !== 'CUSTOMER_REQUESTED').length;
              const badgeClass = e.status === 'APPROVED' ? 'bg-success'
                : e.status === 'REJECTED' ? 'bg-danger'
                : e.status === 'CHANGES_REQUESTED' ? 'bg-info text-dark'
                : 'bg-warning text-dark';
              return (
                <div key={e.estimateId} className="border-bottom pb-2 mb-2">
                  <div className="d-flex justify-content-between">
                    <span className="small text-secondary">{e.estimateNumber}{(e.revisionNumber || 1) > 1 && ` REV ${e.revisionNumber}`}</span>
                    <span className={`badge ${badgeClass}`}>{e.status.replace('_', ' ')}</span>
                  </div>
                  <div className="fw-semibold">{Number(e.grandTotal).toFixed(2)}</div>
                  <div className="small text-secondary">
                    {requestedCount} requested · {recommendedCount} recommended
                    {e.validUntil && ` · Valid until ${dayjs(e.validUntil).format('DD MMM YYYY')}`}
                  </div>
                  {e.status === 'PENDING' && requestingChangesFor !== e.estimateId && (
                    <div className="d-flex gap-2 mt-1">
                      <button className="btn btn-sm btn-success" onClick={() => approve(e.estimateId)}>Approve</button>
                      <button className="btn btn-sm btn-outline-warning" onClick={() => { setRequestingChangesFor(e.estimateId); setChangeNotes(''); }}>Request Changes</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => reject(e.estimateId)}>Reject</button>
                    </div>
                  )}
                  {requestingChangesFor === e.estimateId && (
                    <div className="mt-2">
                      <textarea
                        className="form-control form-control-sm mb-2"
                        rows={2}
                        placeholder="What should change? e.g. add AC check, remove wheel alignment, additional complaint..."
                        value={changeNotes}
                        onChange={(ev) => setChangeNotes(ev.target.value)}
                      />
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-warning" onClick={() => submitChangeRequest(e)}>Submit &amp; Revise</button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setRequestingChangesFor(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                  {e.status === 'CHANGES_REQUESTED' && revisingEstimateId !== e.estimateId && (
                    <button type="button" className="btn btn-sm btn-outline-primary mt-1" onClick={() => startRevision(e)}>
                      Edit &amp; Create Revision
                    </button>
                  )}
                  <EstimateActions estimate={e} jobCard={jobCard} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Estimate send / share / copy ----------------
 * No WhatsApp/SMS provider is wired into the backend yet (see Phase 5 report) — every send call
 * still round-trips to the server and logs the attempt, but the resolved status is honestly
 * NOT_CONFIGURED (or FAILED with no number on file), never a faked "Sent".
 */
const NOTIFICATION_STATUS_META = {
  NOT_CONFIGURED: { label: 'Not Configured', tone: 'secondary' },
  FAILED: { label: 'Failed', tone: 'danger' },
  SENT: { label: 'Sent', tone: 'success' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
};

function EstimateActions({ estimate, jobCard }) {
  const [logs, setLogs] = useState([]);
  const [sending, setSending] = useState(null);

  useEffect(() => {
    notificationsService.getByReference('ESTIMATE', estimate.estimateId).then((data) => setLogs(asList(data)));
  }, [estimate.estimateId]);

  const latestFor = (channel) => logs.find((l) => l.channel === channel);

  const send = async (channel) => {
    setSending(channel);
    try {
      const company = await getCompanyDetails();
      const message = estimateSummaryText(estimate, jobCard, company);
      const recipientPhone = channel === 'WHATSAPP' ? (jobCard.customerWhatsapp || jobCard.customerPhone) : jobCard.customerPhone;
      const log = await notificationsService.send({
        channel,
        recipientPhone,
        referenceType: 'ESTIMATE',
        referenceId: estimate.estimateId,
        subject: estimate.estimateNumber,
        message,
      });
      setLogs((prev) => [log, ...prev]);
      const channelLabel = channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS';
      if (log.status === 'NOT_CONFIGURED') {
        toast(`${channelLabel} isn't configured on the server yet`, { icon: '⚠️' });
      } else if (log.status === 'FAILED') {
        toast.error(log.errorMessage || `${channelLabel} send failed`);
      } else {
        toast.success(`${channelLabel} sent`);
      }
    } catch {
      toast.error('Could not reach the server — please try again');
    } finally {
      setSending(null);
    }
  };

  const copy = async () => {
    try {
      const company = await getCompanyDetails();
      await navigator.clipboard.writeText(estimateSummaryText(estimate, jobCard, company));
      toast.success('Estimate copied to clipboard');
    } catch {
      toast.error("Could not copy — the browser blocked clipboard access");
    }
  };

  const share = async () => {
    try {
      const result = await shareEstimatePdf(estimate, jobCard);
      if (result === 'downloaded') toast("Sharing isn't available on this device — downloaded the PDF instead.", { icon: '📄' });
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error('Could not share the estimate');
    }
  };

  const channelButton = (channel, Icon, label) => {
    const meta = NOTIFICATION_STATUS_META[latestFor(channel)?.status];
    return (
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
        onClick={() => send(channel)}
        disabled={sending === channel}
      >
        <Icon size={13} /> {sending === channel ? 'Sending...' : label}
        {meta && <span className={`badge bg-${meta.tone} ${meta.tone === 'warning' ? 'text-dark' : ''}`}>{meta.label}</span>}
      </button>
    );
  };

  return (
    <div className="d-flex flex-wrap gap-2 mt-2">
      {channelButton('WHATSAPP', FiMessageCircle, 'WhatsApp')}
      {channelButton('SMS', FiMessageSquare, 'SMS')}
      <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={copy}>
        <FiCopy size={13} /> Copy
      </button>
      <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={() => downloadEstimatePdf(estimate, jobCard)}>
        <FiDownload size={13} /> PDF
      </button>
      <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={share}>
        <FiShare2 size={13} /> Share
      </button>
    </div>
  );
}

/* ---------------- Technician ---------------- */
function TechnicianTab({ jobCard, onSaved }) {
  const [users, setUsers] = useState([]);
  // Same GET /api/users SUPER_ADMIN-only gap as DeliveryChecklist — a MANAGER got two
  // permanently-empty, unusable dropdowns here with no explanation. See the QA report.
  const [staffListUnavailable, setStaffListUnavailable] = useState(false);
  const [advisorUserId, setAdvisorUserId] = useState(jobCard.advisorUserId || '');
  const [technicianUserId, setTechnicianUserId] = useState(jobCard.technicianUserId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    usersService.getAll(undefined, { skipErrorToast: true })
      .then((data) => setUsers(asList(data)))
      .catch(() => setStaffListUnavailable(true));
  }, []);

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
      {staffListUnavailable && (
        <div className="alert alert-warning small">
          Staff list couldn&apos;t be loaded for your role — ask a Super Admin to assign staff, or to grant staff-list access to this role.
        </div>
      )}
      <div className="mb-3">
        <label className="form-label">Service Advisor</label>
        <select className="form-select" value={advisorUserId} onChange={(e) => setAdvisorUserId(e.target.value)} disabled={staffListUnavailable}>
          <option value="">Unassigned</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Technician</label>
        <select className="form-select" value={technicianUserId} onChange={(e) => setTechnicianUserId(e.target.value)} disabled={staffListUnavailable}>
          <option value="">Unassigned</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
        </select>
      </div>
      <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Assignment'}</button>
    </div>
  );
}

/* ---------------- Additional Work ----------------
 * Work the technician discovers mid-service, outside the original estimate (e.g. a worn wheel
 * bearing found during a brake job). Never auto-billed — its own approve/reject cycle, separate
 * from the Estimate one. Only APPROVED requests are ever pulled into the final invoice.
 */
function AdditionalWorkTab({ jobCard, onSaved }) {
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [requests, setRequests] = useState(null);
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRequests = () => additionalWorkService.getByJobCard(jobCard.jobCardId).then((data) => setRequests(asList(data)));

  useEffect(() => {
    Promise.all([serviceMasterService.getAll(), productsService.getAll({ itemType: 'PRODUCT' })]).then(([s, p]) => {
      setServices(asList(s).filter((x) => (x.status || 'active').toLowerCase() === 'active'));
      setProducts(asList(p));
    });
    loadRequests();
  }, [jobCard.jobCardId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vehicle-type applies-to-both convention: blank/null vehicleType means every vehicle,
  // so only exclude items explicitly restricted to the OTHER category.
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
        0
      ),
    [cart]
  );

  const sendForApproval = async () => {
    if (cart.length === 0) return toast.error('Add at least one service or product');
    setSaving(true);
    try {
      await additionalWorkService.create({
        jobCardId: jobCard.jobCardId,
        requestedByUserId: jobCard.technicianUserId || null,
        notes,
        items: cart.map((l) => ({
          itemType: l.itemType,
          serviceId: l.itemType === 'SERVICE' ? l.refId : null,
          productId: l.itemType === 'PRODUCT' ? l.refId : null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount,
        })),
      });
      toast.success('Sent for customer approval');
      setCart([]);
      setNotes('');
      loadRequests();
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  };

  const approve = async (id) => {
    await additionalWorkService.approve(id, 'Customer');
    toast.success('Additional work approved — resuming service');
    loadRequests();
    onSaved();
  };

  const reject = async (id) => {
    await additionalWorkService.reject(id, 'Customer');
    toast.error('Additional work rejected — not billed, resuming service');
    loadRequests();
    onSaved();
  };

  if (!requests) return <Loader label="Loading additional work..." />;

  return (
    <div className="row g-3">
      <div className="col-lg-7">
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

        <div className="erp-card p-0 mb-3">
          <div className="table-responsive">
            {/* table-layout: fixed — see the matching comment on the Estimate tab's cart table;
                same fix for the same "Qty input renders blank next to a long product name" bug. */}
            <table className="table mb-0" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead><tr><th style={{ width: 90 }}>Type</th><th>Item</th><th style={{ width: 80 }}>Qty</th><th style={{ width: 90 }}>Rate</th><th style={{ width: 100 }}>Discount</th><th style={{ width: 100 }}>Amount</th><th style={{ width: 48 }} /></tr></thead>
              <tbody>
                {cart.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-3">Nothing added yet — search above.</td></tr>}
                {cart.map((l, idx) => (
                  <tr key={idx}>
                    <td><span className={`badge ${l.itemType === 'SERVICE' ? 'erp-badge-service' : 'erp-badge-product'}`}>{l.itemType === 'SERVICE' ? 'Service' : 'Product'}</span></td>
                    <td>{l.name}</td>
                    <td style={{ width: 80 }}>
                      <input type="number" min="1" aria-label={`Quantity for ${l.name}`} className="form-control form-control-sm" value={l.quantity} onChange={(e) => setCart((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) || 1 } : x)))} />
                    </td>
                    <td>{Number(l.unitPrice).toFixed(2)}</td>
                    <td style={{ width: 100 }}>
                      <input type="number" min="0" aria-label={`Discount for ${l.name}`} className="form-control form-control-sm" value={l.discount} onChange={(e) => setCart((prev) => prev.map((x, i) => (i === idx ? { ...x, discount: Number(e.target.value) || 0 } : x)))} />
                    </td>
                    <td>{(l.unitPrice * l.quantity - l.discount).toFixed(2)}</td>
                    <td><button className="btn btn-sm btn-outline-danger" aria-label={`Remove ${l.name}`} onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}><FiTrash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="erp-card p-3">
          <label className="form-label small text-secondary">Why is this needed? (shown to the customer)</label>
          <textarea className="form-control mb-3" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Found excessive play in the front wheel bearing during the brake job" />
          <div className="d-flex justify-content-between align-items-center">
            <div><span className="text-secondary small">Additional Total: </span><strong>{totals.grandTotal.toFixed(2)}</strong></div>
            <button className="btn btn-warning" onClick={sendForApproval} disabled={saving}>
              {saving ? 'Sending...' : 'Send for Customer Approval'}
            </button>
          </div>
        </div>
      </div>

      <div className="col-lg-5">
        <div className="erp-card p-3">
          <h6>History</h6>
          {requests.length === 0 && <p className="text-secondary small mb-0">No additional work requested yet.</p>}
          {requests.map((r) => (
            <div key={r.additionalWorkRequestId} className="border-bottom pb-2 mb-2">
              <div className="d-flex justify-content-between">
                <span className="small text-secondary">{dayjs(r.requestedAt).format('DD MMM, HH:mm')}</span>
                <span className={`badge ${r.status === 'APPROVED' ? 'bg-success' : r.status === 'REJECTED' ? 'bg-danger' : 'bg-warning text-dark'}`}>{r.status}</span>
              </div>
              <ul className="small mb-1 ps-3">
                {(r.items || []).map((it) => (
                  <li key={it.additionalWorkItemId}>{it.description} × {it.quantity} — {Number(it.totalAmount).toFixed(2)}</li>
                ))}
              </ul>
              <div className="fw-semibold">{Number(r.grandTotal).toFixed(2)}</div>
              {r.requestedByName && <div className="small text-secondary">Requested by {r.requestedByName}</div>}
              {r.notes && <div className="small text-secondary fst-italic">&quot;{r.notes}&quot;</div>}
              {r.status !== 'PENDING' && (
                <div className="small text-secondary">
                  {r.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {r.decidedBy || 'customer'} · {dayjs(r.decidedAt).format('DD MMM, HH:mm')}
                </div>
              )}
              {r.status === 'PENDING' && (
                <div className="d-flex gap-2 mt-1">
                  <button className="btn btn-sm btn-success" onClick={() => approve(r.additionalWorkRequestId)}>Approve</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => reject(r.additionalWorkRequestId)}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
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
  const [estimates, setEstimates] = useState(null);
  const [additionalWork, setAdditionalWork] = useState(null);
  const [feeAmount, setFeeAmount] = useState(500);

  useEffect(() => {
    if (jobCard.invoiceId) {
      invoicesService.getById(jobCard.invoiceId).then((inv) => { setInvoice(inv); setLoading(false); });
    } else {
      setLoading(false);
    }
    estimatesService.getByJobCard(jobCard.jobCardId).then((data) => setEstimates(asList(data)));
    additionalWorkService.getByJobCard(jobCard.jobCardId).then((data) => setAdditionalWork(asList(data)));
  }, [jobCard.invoiceId, jobCard.jobCardId]);

  const generateInvoice = async () => {
    const amount = Number(paidAmount || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Amount Received must be a valid number, 0 or more');
      return;
    }
    setGenerating(true);
    try {
      // Never submit more than what's actually owed — anything typed above the total is change
      // handed back at the counter, not revenue applied to the invoice. Submitting the raw
      // over-amount is exactly what used to let paidAmount exceed grandTotal and drive
      // balanceAmount negative (see InvoiceServiceImpl's overpayment guard, which would now
      // reject it anyway); capping here keeps the number that hits the API always billing-safe.
      const amountToApply = Math.min(amount, finalTotal);
      const inv = await jobCardsService.generateInvoice(jobCard.jobCardId, { paymentMethod, paidAmount: amountToApply });
      toast.success(`Invoice ${inv.invoiceNumber} generated`);
      setInvoice(inv);
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setGenerating(false);
    }
  };

  const generateInspectionFeeInvoice = async () => {
    setGenerating(true);
    try {
      const inv = await jobCardsService.generateInspectionFeeInvoice(jobCard.jobCardId, {
        paymentMethod,
        paidAmount: Number(paidAmount || 0),
        feeAmount: Number(feeAmount || 0),
      });
      toast.success(`Inspection fee invoice ${inv.invoiceNumber} generated`);
      setInvoice(inv);
      onSaved();
    } catch {
      // toast already shown
    } finally {
      setGenerating(false);
    }
  };

  if (loading || !estimates || !additionalWork) return <Loader label="Loading invoice..." />;

  const hasApproved = estimates.some((e) => e.status === 'APPROVED');
  // An approved estimate takes priority over any other stray PENDING/CHANGES_REQUESTED one on
  // this job card — e.g. an abandoned revision left at CHANGES_REQUESTED after staff started a
  // fresh estimate instead of following through on it. The backend already resolves this the
  // same way (JobCardServiceImpl.generateInvoice picks the most-recently-created APPROVED
  // estimate, ignoring stale undecided ones); this used to block the button even when there was
  // a perfectly valid approved estimate to invoice.
  const hasUndecided = !hasApproved && estimates.some((e) => e.status === 'PENDING' || e.status === 'CHANGES_REQUESTED');
  const hasRejected = estimates.some((e) => e.status === 'REJECTED');
  // Service was declined: no estimate is approved or still awaiting a decision, but at least
  // one was rejected — the only thing chargeable is the inspection itself, never the declined work.
  const rejectedOnly = !hasApproved && !hasUndecided && hasRejected;

  // Same estimate the backend will actually bill from — JobCardServiceImpl.generateInvoice picks
  // the most-recently-created APPROVED estimate, so the preview here must pick the same one.
  // Everything below is built from data already loaded (Estimate + Additional Work tabs' own
  // records) — no separate total is computed or stored, just previewed ahead of generation.
  const approvedEstimate = estimates
    .filter((e) => e.status === 'APPROVED')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  const approvedEstimateTotal = Number(approvedEstimate?.grandTotal || 0);
  const approvedAdditionalWork = additionalWork.filter((r) => r.status === 'APPROVED');
  const approvedAdditionalWorkTotal = approvedAdditionalWork.reduce((sum, r) => sum + Number(r.grandTotal || 0), 0);
  const finalTotal = approvedEstimateTotal + approvedAdditionalWorkTotal;

  const receivedAmount = Number(paidAmount || 0);
  const receivedIsValid = paidAmount !== '' && Number.isFinite(receivedAmount) && receivedAmount >= 0;
  const paymentDiff = receivedIsValid ? Math.round((receivedAmount - finalTotal) * 100) / 100 : 0;

  if (!invoice) {
    return (
      <div className="erp-card p-3" style={{ maxWidth: 480 }}>
        {rejectedOnly ? (
          <div className="alert alert-warning small mb-3">
            The customer rejected the estimated work — this invoice can only include the
            inspection fee, not the declined service/parts.
          </div>
        ) : (
          <p className="text-secondary small">
            {hasUndecided
              ? 'An estimate is still awaiting the customer\'s decision — approve or reject it on the Estimate tab first.'
              : 'No invoice yet — generated from the latest approved estimate.'}
          </p>
        )}

        {!rejectedOnly && hasApproved && (
          <div className="erp-card p-3 mb-3 bg-light">
            <h6 className="text-secondary text-uppercase small mb-2" style={{ letterSpacing: '0.04em' }}>Invoice Summary</h6>
            <div className="d-flex justify-content-between">
              <span>Approved Estimate</span>
              <span>{approvedEstimateTotal.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Additional Work{approvedAdditionalWork.length > 1 ? ` (${approvedAdditionalWork.length})` : ''}</span>
              <span>{approvedAdditionalWorkTotal.toFixed(2)}</span>
            </div>
            <hr className="my-2" />
            <div className="d-flex justify-content-between align-items-center">
              <strong>TOTAL AMOUNT DUE</strong>
              <strong className="fs-5 text-primary">{finalTotal.toFixed(2)}</strong>
            </div>
            <div className="small text-secondary mt-1">Customer should pay: <strong>{finalTotal.toFixed(2)}</strong></div>
          </div>
        )}

        <div className="mb-3">
          <label className="form-label">Payment Method</label>
          <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {rejectedOnly && (
          <div className="mb-3">
            <label className="form-label">Inspection Fee</label>
            <input type="number" min="0" className="form-control" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} />
          </div>
        )}
        <div className="mb-2">
          <label className="form-label">Amount Received from Customer</label>
          <input type="number" min="0" className="form-control" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
          <div className="form-text">Enter the amount actually received from the customer.</div>
        </div>

        {!rejectedOnly && hasApproved && receivedIsValid && paidAmount !== '' && (
          <div className={`small mb-3 fw-semibold ${paymentDiff === 0 ? 'text-success' : paymentDiff < 0 ? 'text-danger' : 'text-info'}`}>
            {paymentDiff === 0 && <>✓ PAID IN FULL — Balance Due: 0.00</>}
            {paymentDiff < 0 && <>⚠ BALANCE DUE: {Math.abs(paymentDiff).toFixed(2)}</>}
            {paymentDiff > 0 && <>⚠ CHANGE TO RETURN: {paymentDiff.toFixed(2)} (only {finalTotal.toFixed(2)} will be recorded as paid)</>}
          </div>
        )}

        {rejectedOnly ? (
          <button className="btn btn-warning" onClick={generateInspectionFeeInvoice} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Inspection Fee Invoice'}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={generateInvoice} disabled={generating || hasUndecided || !receivedIsValid}>
            {generating ? 'Generating...' : 'Generate Invoice'}
          </button>
        )}
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
        </div>
      </div>
      <div className="d-flex justify-content-between"><span>Service Subtotal</span><span>{Number(invoice.serviceSubtotal).toFixed(2)}</span></div>
      <div className="d-flex justify-content-between"><span>Product Subtotal</span><span>{Number(invoice.productSubtotal).toFixed(2)}</span></div>
      <div className="d-flex justify-content-between"><span>CGST</span><span>{Number(invoice.cgstAmount).toFixed(2)}</span></div>
      <div className="d-flex justify-content-between"><span>SGST</span><span>{Number(invoice.sgstAmount).toFixed(2)}</span></div>
      <div className="d-flex justify-content-between"><strong>Grand Total</strong><strong>{Number(invoice.grandTotal).toFixed(2)}</strong></div>
      <div className="d-flex justify-content-between"><span>Paid</span><span>{Number(invoice.paidAmount).toFixed(2)}</span></div>
      <div className="d-flex justify-content-between"><span>Balance</span><span>{Number(invoice.balanceAmount).toFixed(2)}</span></div>

      {(jobCard.status === 'READY_FOR_DELIVERY' || jobCard.status === 'DELIVERED') && (
        <DeliveryChecklist jobCard={jobCard} invoice={invoice} estimates={estimates} onDelivered={onSaved} />
      )}
    </div>
  );
}

/* ---------------- Delivery Checklist ----------------
 * Service completed / quality check completed / invoice generated / payment status / customer
 * approval are all derived from data that already exists (job card status, QC history, the
 * invoice itself, the approved estimate) — shown, not re-asked. Vehicle cleaning, customer
 * belongings, and keys have no other source of truth, so the server requires them explicitly
 * (see JobCardServiceImpl.markDelivered) — this is enforcement, not just a UI nicety.
 */
function DeliveryChecklist({ jobCard, invoice, estimates, onDelivered }) {
  const [qualityChecks, setQualityChecks] = useState(null);
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
    qualityChecksService.getByJobCard(jobCard.jobCardId).then((data) => setQualityChecks(asList(data)));
    usersService.getAll(undefined, { skipErrorToast: true })
      .then((data) => setUsers(asList(data)))
      .catch(() => setStaffListUnavailable(true));
  }, [jobCard.jobCardId]);

  const delivered = jobCard.status === 'DELIVERED';
  const qcPassed = (qualityChecks || []).some((c) => c.result === 'PASS');
  const approvedEstimate = (estimates || []).find((e) => e.status === 'APPROVED');
  const canConfirm = deliveredByUserId && vehicleCleaned && belongingsChecked && keysReady;

  const checklistItems = [
    { label: 'Service completed', done: true },
    { label: 'Quality check completed', done: qcPassed, note: qcPassed ? 'Passed' : 'No passing quality check on record' },
    { label: 'Invoice generated', done: Boolean(invoice), note: invoice?.invoiceNumber },
    {
      label: 'Payment status',
      done: invoice?.paymentStatus === 'PAID',
      note: invoice?.paymentStatus,
      warnOnly: true,
    },
    {
      label: 'Customer approval',
      done: Boolean(approvedEstimate),
      note: approvedEstimate ? `${approvedEstimate.estimateNumber} approved` : 'No approved estimate on record',
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

  if (qualityChecks === null) return null;

  return (
    <div className="mt-3 pt-3 border-top">
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
