import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import vehiclesService from '../services/vehiclesService';

const emptyForm = () => ({
  make: '', vehicleModel: '', variant: '', registrationNumber: '', odometer: '',
  vehicleType: '', fuelType: '', color: '', year: '', chassisNumber: '', engineNumber: '', notes: '',
});

// Vehicle-only — the customer is already known, so we never ask for it again (spec: existing
// customers get "+ Add Vehicle", not the full combined form).
export default function AddVehicleModal({ show, customer, onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleClose = () => {
    setForm(emptyForm());
    onClose();
  };

  const save = async () => {
    if (!form.vehicleModel.trim()) return toast.error('Vehicle model is required');
    if (!form.registrationNumber.trim()) return toast.error('Registration number is required');

    setSaving(true);
    try {
      const vehicle = await vehiclesService.create({
        customerId: customer.id,
        make: form.make || null,
        vehicleModel: form.vehicleModel,
        variant: form.variant || null,
        registrationNumber: form.registrationNumber,
        odometer: form.odometer ? Number(form.odometer) : null,
        vehicleType: form.vehicleType || null,
        fuelType: form.fuelType || null,
        color: form.color || null,
        year: form.year ? Number(form.year) : null,
        chassisNumber: form.chassisNumber || null,
        engineNumber: form.engineNumber || null,
        notes: form.notes || null,
      });
      toast.success(`${vehicle.vehicleModel} added to ${customer.customerName}`);
      setForm(emptyForm());
      onCreated(vehicle);
    } catch {
      // Global toast already shown by the axios interceptor.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={show}
      title="Add Vehicle"
      size="modal-lg"
      onClose={handleClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={handleClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Vehicle'}</button>
        </>
      }
    >
      <div className="mb-3 p-2 rounded" style={{ background: 'var(--erp-bg)' }}>
        <span className="text-secondary small">Customer</span>
        <div className="fw-semibold">{customer?.customerName}</div>
      </div>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Make *</label>
          <input className="form-control" value={form.make} onChange={(e) => set({ make: e.target.value })} placeholder="e.g. Audi" />
        </div>
        <div className="col-md-6">
          <label className="form-label">Model *</label>
          <input className="form-control" value={form.vehicleModel} onChange={(e) => set({ vehicleModel: e.target.value })} placeholder="e.g. A4" />
        </div>
        <div className="col-md-6">
          <label className="form-label">Variant</label>
          <input className="form-control" value={form.variant} onChange={(e) => set({ variant: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Registration Number *</label>
          <input className="form-control" value={form.registrationNumber} onChange={(e) => set({ registrationNumber: e.target.value })} placeholder="e.g. TN 01 AB 1234" />
        </div>
        <div className="col-md-6">
          <label className="form-label">Current Odometer (km)</label>
          <input type="number" min="0" className="form-control" value={form.odometer} onChange={(e) => set({ odometer: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Vehicle Type</label>
          <select className="form-select" value={form.vehicleType} onChange={(e) => set({ vehicleType: e.target.value })}>
            <option value="">Select...</option>
            {['Hatchback', 'Sedan', 'SUV', 'Van', 'Other'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Fuel Type</label>
          <select className="form-select" value={form.fuelType} onChange={(e) => set({ fuelType: e.target.value })}>
            <option value="">Select...</option>
            {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Color</label>
          <input className="form-control" value={form.color} onChange={(e) => set({ color: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Year</label>
          <input type="number" className="form-control" value={form.year} onChange={(e) => set({ year: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label">VIN / Chassis Number</label>
          <input className="form-control" value={form.chassisNumber} onChange={(e) => set({ chassisNumber: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Engine Number</label>
          <input className="form-control" value={form.engineNumber} onChange={(e) => set({ engineNumber: e.target.value })} />
        </div>
        <div className="col-12">
          <label className="form-label">Notes</label>
          <input className="form-control" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}
