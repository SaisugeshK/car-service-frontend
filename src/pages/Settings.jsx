import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiSave, FiUpload, FiTrash2, FiInfo } from 'react-icons/fi';
import settingsService from '../services/settingsService';
import { invalidateCompanyDetailsCache } from '../utils/invoicePdf';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

// Every field here is just a well-known key in the same generic Setting(settingKey, settingValue)
// store the rest of the app already reads (PointOfSale, invoicePdf's getCompanyDetails) — no new
// backend table, no new endpoint. Phase 31 is a frontend structuring of existing infrastructure,
// plus 3 real backend wirings (invoice/estimate/job-card number prefixes actually read these now
// — see InvoiceServiceImpl/EstimateServiceImpl/JobCardServiceImpl — not just stored and ignored).
const SIMPLE_KEYS = [
  'company_name', 'company_tagline', 'company_phone', 'company_whatsapp', 'company_email', 'company_address', 'company_gstin',
  'company_logo',
  'invoice_prefix', 'estimate_prefix', 'job_card_prefix', 'default_tax_rate',
  'invoice_terms', 'invoice_footer',
  'business_hours',
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const defaultHours = () => DAY_LABELS.map((day) => ({ day, open: '09:00', close: '19:00', closed: day === 'Sun' }));

const MAX_LOGO_BYTES = 150 * 1024; // keeps every settings fetch across the app light — PointOfSale
// loads all settings on every visit, so a multi-MB logo would slow that down for everyone.

function Field({ label, children, hint }) {
  return (
    <div className="mb-3">
      <label className="form-label small mb-1">{label}</label>
      {children}
      {hint && <div className="form-text">{hint}</div>}
    </div>
  );
}

export default function Settings() {
  const [rawSettings, setRawSettings] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({});
  const [hours, setHours] = useState(defaultHours());
  const fileInputRef = useRef(null);

  const load = () => {
    setLoadError(false);
    settingsService
      .getAll()
      .then((data) => {
        const list = asList(data);
        setRawSettings(list);
        const get = (key) => list.find((s) => s.settingKey === key)?.settingValue ?? '';
        const next = {};
        SIMPLE_KEYS.forEach((k) => { next[k] = get(k); });
        setValues(next);
        try {
          const parsedHours = get('business_hours');
          setHours(parsedHours ? JSON.parse(parsedHours) : defaultHours());
        } catch {
          setHours(defaultHours());
        }
      })
      .catch(() => setLoadError(true));
  };

  useEffect(load, []);

  const setValue = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');
    if (file.size > MAX_LOGO_BYTES) return toast.error(`Logo must be under ${Math.round(MAX_LOGO_BYTES / 1024)}KB`);
    const reader = new FileReader();
    reader.onload = () => setValue('company_logo', reader.result);
    reader.onerror = () => toast.error('Could not read that file');
    reader.readAsDataURL(file);
  };

  const updateHour = (idx, patch) => setHours((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));

  // One key at a time, matching the same "upsert by key against the existing rows we already
  // loaded" pattern Products.jsx already uses for the Product↔ProductTax GST merge (upsertGst).
  const upsert = async (key, value) => {
    const existing = rawSettings.find((s) => s.settingKey === key);
    if (existing) {
      if (existing.settingValue === value) return; // unchanged — skip the write
      await settingsService.update(existing.id, { settingKey: key, settingValue: value });
    } else {
      if (value === '' || value == null) return; // nothing to create for a still-empty field
      await settingsService.create({ settingKey: key, settingValue: value });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...values, business_hours: JSON.stringify(hours) };
      await Promise.all(SIMPLE_KEYS.map((k) => upsert(k, payload[k] ?? '')));
      invalidateCompanyDetailsCache();
      toast.success('Settings saved');
      load();
    } catch {
      // Global toast already shown by the axios interceptor.
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <ErrorPage message="Could not load settings. Check your connection and try again." onRetry={load} />;
  if (!rawSettings) return <Loader label="Loading settings..." />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Business Settings</h1>
        <button className="btn btn-primary d-flex align-items-center gap-1" onClick={handleSave} disabled={saving}>
          <FiSave /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="erp-card p-3 mb-3">
            <h6 className="mb-3">Business Information</h6>
            <Field label="Business Name">
              <input className="form-control" value={values.company_name || ''} onChange={(e) => setValue('company_name', e.target.value)} placeholder="AutoCare ERP" />
            </Field>
            <Field label="Tagline" hint="Shown under the business name on the login page and elsewhere — keep it short.">
              <input className="form-control" value={values.company_tagline || ''} onChange={(e) => setValue('company_tagline', e.target.value)} placeholder="One Stop Solution" />
            </Field>
            <div className="row g-2">
              <div className="col-md-6">
                <Field label="Phone">
                  <input className="form-control" value={values.company_phone || ''} onChange={(e) => setValue('company_phone', e.target.value)} />
                </Field>
              </div>
              <div className="col-md-6">
                <Field label="WhatsApp">
                  <input className="form-control" value={values.company_whatsapp || ''} onChange={(e) => setValue('company_whatsapp', e.target.value)} />
                </Field>
              </div>
            </div>
            <Field label="Email">
              <input type="email" className="form-control" value={values.company_email || ''} onChange={(e) => setValue('company_email', e.target.value)} />
            </Field>
            <Field label="Address">
              <textarea className="form-control" rows={2} value={values.company_address || ''} onChange={(e) => setValue('company_address', e.target.value)} />
            </Field>
            <Field label="GSTIN" hint="Your business's GST registration number — printed on every invoice/estimate.">
              <input className="form-control" value={values.company_gstin || ''} onChange={(e) => setValue('company_gstin', e.target.value)} />
            </Field>
          </div>

          <div className="erp-card p-3 mb-3">
            <h6 className="mb-3">Logo</h6>
            <div className="d-flex align-items-center gap-3">
              {values.company_logo ? (
                <img src={values.company_logo} alt="Business logo" style={{ height: 56, maxWidth: 140, objectFit: 'contain', border: '1px solid var(--erp-border)', borderRadius: 8, padding: 4 }} />
              ) : (
                <div className="d-flex align-items-center justify-content-center text-secondary small" style={{ height: 56, width: 96, border: '1px dashed var(--erp-border-strong)', borderRadius: 8 }}>
                  No logo
                </div>
              )}
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" onClick={() => fileInputRef.current?.click()}>
                  <FiUpload size={13} /> Upload
                </button>
                {values.company_logo && (
                  <button type="button" className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1" onClick={() => setValue('company_logo', '')}>
                    <FiTrash2 size={13} /> Remove
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="d-none" onChange={handleLogoFile} />
            </div>
            <div className="form-text">Image, under {Math.round(MAX_LOGO_BYTES / 1024)}KB. Stored with your other settings — not yet printed on PDFs (a future enhancement).</div>
          </div>

          <div className="erp-card p-3 mb-3">
            <h6 className="mb-3">Billing & Numbering</h6>
            <div className="row g-2">
              <div className="col-md-4">
                <Field label="Invoice Prefix" hint="e.g. INV-...">
                  <input className="form-control" value={values.invoice_prefix || ''} onChange={(e) => setValue('invoice_prefix', e.target.value.toUpperCase())} placeholder="INV" />
                </Field>
              </div>
              <div className="col-md-4">
                <Field label="Estimate Prefix">
                  <input className="form-control" value={values.estimate_prefix || ''} onChange={(e) => setValue('estimate_prefix', e.target.value.toUpperCase())} placeholder="EST" />
                </Field>
              </div>
              <div className="col-md-4">
                <Field label="Job Card Prefix">
                  <input className="form-control" value={values.job_card_prefix || ''} onChange={(e) => setValue('job_card_prefix', e.target.value.toUpperCase())} placeholder="JC" />
                </Field>
              </div>
            </div>
            <Field label="Default Tax Rate (%)" hint="Reference default only — each product/service's own configured tax rate is what's actually billed.">
              <input type="number" min="0" step="0.01" className="form-control" style={{ maxWidth: 160 }} value={values.default_tax_rate || ''} onChange={(e) => setValue('default_tax_rate', e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="erp-card p-3 mb-3">
            <h6 className="mb-3">Terms & Invoice Footer</h6>
            <Field label="Terms & Conditions" hint="Printed on invoices and estimates.">
              <textarea className="form-control" rows={3} value={values.invoice_terms || ''} onChange={(e) => setValue('invoice_terms', e.target.value)} placeholder="Terms & Conditions apply." />
            </Field>
            <Field label="Invoice Footer">
              <textarea className="form-control" rows={2} value={values.invoice_footer || ''} onChange={(e) => setValue('invoice_footer', e.target.value)} placeholder="Thank you for visiting us." />
            </Field>
          </div>

          <div className="erp-card p-3 mb-3">
            <h6 className="mb-3">Notification Settings</h6>
            <div className="d-flex align-items-start gap-2 small text-secondary">
              <FiInfo size={16} className="flex-shrink-0 mt-1" />
              <span>
                No WhatsApp/SMS provider is connected to this backend yet — every notification honestly reports
                <span className="badge bg-secondary mx-1">NOT_CONFIGURED</span>
                rather than claiming it sent. There are no provider credentials to configure here — when a provider
                (Twilio, Gupshup, etc.) is wired in, that setup happens on the backend, never as a secret typed into this page.
              </span>
            </div>
          </div>

          <div className="erp-card p-3">
            <h6 className="mb-3">Business Hours</h6>
            {hours.map((h, idx) => (
              <div key={h.day} className="d-flex align-items-center gap-2 mb-2">
                <span className="small fw-semibold" style={{ width: 40 }}>{h.day}</span>
                <div className="form-check mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`closed-${h.day}`}
                    checked={!h.closed}
                    onChange={(e) => updateHour(idx, { closed: !e.target.checked })}
                  />
                </div>
                {h.closed ? (
                  <span className="small text-secondary">Closed</span>
                ) : (
                  <>
                    <input type="time" className="form-control form-control-sm" style={{ maxWidth: 120 }} value={h.open} onChange={(e) => updateHour(idx, { open: e.target.value })} />
                    <span className="small text-secondary">to</span>
                    <input type="time" className="form-control form-control-sm" style={{ maxWidth: 120 }} value={h.close} onChange={(e) => updateHour(idx, { close: e.target.value })} />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
