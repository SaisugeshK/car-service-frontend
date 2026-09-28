import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import Modal from './Modal';
import RegularBadge from './RegularBadge';
import visitsService, { VISIT_PURPOSES } from '../services/visitsService';

const digits = (s) => (s || '').replace(/\D/g, '');

// Log a customer visit.
//  - From the Visits page (no `customer`): identify by mobile + registration. The form shows,
//    as you type, which existing customer/vehicle it matched — or that a new one will be created.
//  - From a customer's profile (`customer` + `vehicles` given): pick one of their vehicles.
export default function LogVisitModal({ customer, vehicles = [], onClose, onLogged }) {
  const fixedCustomer = Boolean(customer);
  const [phone, setPhone] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleCategory, setVehicleCategory] = useState('CAR');
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.vehicleId ? String(vehicles[0].vehicleId) : '');
  const [purpose, setPurpose] = useState('SERVICE');
  const [notes, setNotes] = useState('');
  const [visitDateTime, setVisitDateTime] = useState(dayjs().format('YYYY-MM-DDTHH:mm'));
  const [match, setMatch] = useState(null);
  const [saving, setSaving] = useState(false);

  // Live match preview (debounced) — only once there's enough typed to mean something.
  useEffect(() => {
    if (fixedCustomer) return undefined;
    const phoneOk = digits(phone).length >= 10;
    const regOk = registrationNumber.replace(/[\s-]/g, '').length >= 4;
    if (!phoneOk && !regOk) { setMatch(null); return undefined; }
    const t = setTimeout(() => {
      visitsService.lookup(phoneOk ? phone : undefined, regOk ? registrationNumber : undefined)
        .then(setMatch)
        .catch(() => setMatch(null));
    }, 350);
    return () => clearTimeout(t);
  }, [phone, registrationNumber, fixedCustomer]);

  const regTyped = registrationNumber.replace(/[\s-]/g, '').length >= 4;
  const needsCustomerName = !fixedCustomer && match && !match.customerId && digits(phone).length >= 10;
  const needsVehicleModel = !fixedCustomer && match && !match.vehicleId && regTyped;

  const save = async () => {
    if (!fixedCustomer) {
      if (digits(phone).length < 10) return toast.error('Enter the 10-digit mobile number');
      if (!regTyped) return toast.error('Enter the vehicle registration number');
      if (needsCustomerName && !customerName.trim()) return toast.error("New customer — enter the customer's name");
      if (needsVehicleModel && !vehicleModel.trim()) return toast.error('New vehicle — enter the vehicle model');
    } else if (!vehicleId) {
      return toast.error('Choose the vehicle');
    }
    setSaving(true);
    try {
      const payload = fixedCustomer
        ? { customerId: customer.customerId ?? customer.id, vehicleId: Number(vehicleId) }
        : {
          phone: phone.trim(),
          registrationNumber: registrationNumber.trim(),
          customerName: needsCustomerName ? customerName.trim() : undefined,
          vehicleModel: needsVehicleModel ? vehicleModel.trim() : undefined,
          vehicleCategory: needsVehicleModel ? vehicleCategory : undefined,
        };
      const visit = await visitsService.log({
        ...payload,
        purpose,
        notes: notes.trim() || null,
        visitDateTime: visitDateTime ? dayjs(visitDateTime).format() : null,
      });
      const extras = [visit.createdCustomer && 'new customer created', visit.createdVehicle && 'new vehicle added'].filter(Boolean).join(', ');
      toast.success(`Visit logged for ${visit.customerName}${extras ? ` (${extras})` : ''}`);
      onLogged?.(visit);
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show
      title={fixedCustomer ? `Log Visit — ${customer.customerName}` : 'Log Visit'}
      onClose={() => !saving && onClose()}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Log Visit'}</button>
        </>
      }
    >
      <div className="row g-3">
        {fixedCustomer ? (
          <div className="col-12">
            <label className="form-label" htmlFor="lv-vehicle">Vehicle <span className="text-danger">*</span></label>
            {vehicles.length === 0 ? (
              <div className="small text-danger">This customer has no vehicle on file — log the visit from the Visits page with the registration number.</div>
            ) : (
              <select id="lv-vehicle" className="form-select" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                {vehicles.map((v) => <option key={v.vehicleId} value={v.vehicleId}>{v.vehicleModel} — {v.registrationNumber || 'no reg.'}</option>)}
              </select>
            )}
          </div>
        ) : (
          <>
            <div className="col-md-6">
              <label className="form-label" htmlFor="lv-phone">Mobile Number <span className="text-danger">*</span></label>
              <input id="lv-phone" className="form-control" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" autoFocus />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="lv-reg">Registration Number <span className="text-danger">*</span></label>
              <input id="lv-reg" className="form-control text-uppercase" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="e.g. TN 01 AB 1234" />
            </div>

            {match && (match.customerId || match.vehicleId || needsCustomerName || needsVehicleModel) && (
              <div className="col-12">
                <div className="border rounded p-2 small" style={{ background: 'var(--erp-bg)' }}>
                  {match.customerId ? (
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span>Customer: <strong>{match.customerName}</strong> ({match.customerPhone})</span>
                      <RegularBadge status={match.regularStatus} short />
                      <span className="text-secondary">{match.totalVisits || 0} visits{match.lastVisitDate ? ` · last ${dayjs(match.lastVisitDate).format('DD MMM YYYY')}` : ''}</span>
                    </div>
                  ) : needsCustomerName && <div className="text-primary">New customer — will be created with this mobile number.</div>}
                  {match.vehicleId ? (
                    <div>Vehicle: <strong>{match.vehicleModel}</strong> ({match.registrationNumber})</div>
                  ) : needsVehicleModel && <div className="text-primary">New vehicle — will be added to this customer.</div>}
                  {match.ownerMismatch && (
                    <div className="text-danger mt-1">
                      This registration belongs to <strong>{match.vehicleOwnerName}</strong>, not the customer with this mobile — the visit will be logged under {match.vehicleOwnerName}.
                    </div>
                  )}
                </div>
              </div>
            )}

            {needsCustomerName && (
              <div className="col-12">
                <label className="form-label" htmlFor="lv-name">Customer Name <span className="text-danger">*</span></label>
                <input id="lv-name" className="form-control" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
            )}
            {needsVehicleModel && (
              <>
                <div className="col-md-8">
                  <label className="form-label" htmlFor="lv-model">Vehicle Model <span className="text-danger">*</span></label>
                  <input id="lv-model" className="form-control" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="e.g. Swift, Activa" />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="lv-cat">Type</label>
                  <select id="lv-cat" className="form-select" value={vehicleCategory} onChange={(e) => setVehicleCategory(e.target.value)}>
                    <option value="CAR">Car</option>
                    <option value="BIKE">Bike</option>
                  </select>
                </div>
              </>
            )}
          </>
        )}

        <div className="col-md-6">
          <label className="form-label" htmlFor="lv-purpose">Purpose <span className="text-danger">*</span></label>
          <select id="lv-purpose" className="form-select" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            {VISIT_PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="lv-when">Date &amp; Time</label>
          <input id="lv-when" type="datetime-local" className="form-control" value={visitDateTime} max={dayjs().format('YYYY-MM-DDTHH:mm')} onChange={(e) => setVisitDateTime(e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="lv-notes">Notes</label>
          <textarea id="lv-notes" className="form-control" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
      </div>
    </Modal>
  );
}
