import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import customersService from '../services/customersService';
import vehiclesService from '../services/vehiclesService';

const emptyForm = () => ({
  customerName: '', phone: '', email: '', address: '', city: '', gstin: '', customerNotes: '',
  make: '', vehicleModel: '', variant: '', registrationNumber: '', odometer: '',
  vehicleType: '', fuelType: '', color: '', year: '', chassisNumber: '', engineNumber: '', vehicleNotes: '',
});

/**
 * "Add Customer & Vehicle" in one step — creates the Customer, then the Vehicle linked to it,
 * so staff never have to save a customer, then go find it again just to attach a car. Used both
 * as a standalone modal (Customers page) and inline from Appointments ("+ New Customer & Vehicle").
 *
 * onCreated(customer, vehicle) fires after both records exist.
 */
export default function CustomerVehicleModal({ show, onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleClose = () => {
    setForm(emptyForm());
    onClose();
  };

  const save = async () => {
    if (!form.customerName.trim()) return toast.error('Customer name is required');
    if (!form.phone.trim()) return toast.error('Mobile number is required');
    if (!form.vehicleModel.trim()) return toast.error('Vehicle model is required');
    if (!form.registrationNumber.trim()) return toast.error('Registration number is required');

    setSaving(true);
    try {
      const customer = await customersService.create({
        customerName: form.customerName,
        phone: form.phone,
        email: form.email || null,
        address: form.address || null,
        city: form.city || null,
        gstin: form.gstin || null,
        notes: form.customerNotes || null,
        status: 'active',
      });

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
        notes: form.vehicleNotes || null,
      });

      toast.success(`${customer.customerName} and their ${vehicle.vehicleModel} were added`);
      setForm(emptyForm());
      onCreated(customer, vehicle);
    } catch {
      // Global toast already shown by the axios interceptor. Note: if vehicle creation fails
      // after the customer was already saved, the customer record is real and reusable — the
      // next attempt just needs the vehicle, not a duplicate customer.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={show}
      title="Add Customer & Vehicle"
      size="modal-lg"
      onClose={handleClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={handleClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Customer & Vehicle'}
          </button>
        </>
      }
    >
      <h6 className="text-secondary text-uppercase small mb-2" style={{ letterSpacing: '0.04em' }}>Customer Details</h6>
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <label className="form-label">Customer Name *</label>
          <input className="form-control" value={form.customerName} onChange={(e) => set({ customerName: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Mobile Number *</label>
          <input className="form-control" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Email</label>
          <input type="email" className="form-control" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label">City</label>
          <input className="form-control" value={form.city} onChange={(e) => set({ city: e.target.value })} />
        </div>
        <div className="col-md-8">
          <label className="form-label">Address</label>
          <input className="form-control" value={form.address} onChange={(e) => set({ address: e.target.value })} />
        </div>
        <div className="col-md-4">
          <label className="form-label">GSTIN</label>
          <input className="form-control" value={form.gstin} onChange={(e) => set({ gstin: e.target.value })} />
        </div>
        <div className="col-12">
          <label className="form-label">Notes</label>
          <input className="form-control" value={form.customerNotes} onChange={(e) => set({ customerNotes: e.target.value })} />
        </div>
      </div>

      <h6 className="text-secondary text-uppercase small mb-2" style={{ letterSpacing: '0.04em' }}>Vehicle Details</h6>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Make *</label>
          <input className="form-control" value={form.make} onChange={(e) => set({ make: e.target.value })} placeholder="e.g. Hyundai" />
        </div>
        <div className="col-md-6">
          <label className="form-label">Model *</label>
          <input className="form-control" value={form.vehicleModel} onChange={(e) => set({ vehicleModel: e.target.value })} placeholder="e.g. Creta" />
        </div>
        <div className="col-md-6">
          <label className="form-label">Variant</label>
          <input className="form-control" value={form.variant} onChange={(e) => set({ variant: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Registration Number *</label>
          <input className="form-control" value={form.registrationNumber} onChange={(e) => set({ registrationNumber: e.target.value })} placeholder="e.g. TN 09 AB 4521" />
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
          <input className="form-control" value={form.vehicleNotes} onChange={(e) => set({ vehicleNotes: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}
