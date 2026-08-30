import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import customersService from '../services/customersService';
import vehiclesService from '../services/vehiclesService';
import { sizeClassesFor } from '../utils/vehicleSizeClasses';
import { bodyTypeOptions, fuelTypeOptions } from '../utils/vehicleOptions';

const emptyForm = () => ({
  customerName: '', phone: '', whatsappNumber: '', alternateMobile: '', email: '',
  address: '', city: '', state: '', pincode: '', gstin: '', customerNotes: '',
  make: '', vehicleModel: '', variant: '', registrationNumber: '', odometer: '',
  vehicleType: '', fuelType: '', color: '', year: '', chassisNumber: '', engineNumber: '', vehicleNotes: '',
  vehicleCategory: '', sizeClass: '', insuranceCompany: '', insuranceExpiry: '', pucExpiry: '',
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
  // Category drives type/size/fuel — clear them when it flips so a car value can't linger on a bike.
  const setCategory = (vehicleCategory) => set({ vehicleCategory, vehicleType: '', fuelType: '', sizeClass: '' });

  const handleClose = () => {
    setForm(emptyForm());
    onClose();
  };

  const save = async () => {
    if (!form.customerName.trim()) return toast.error('Customer name is required');
    if (!form.phone.trim()) return toast.error('Mobile number is required');
    if (!form.vehicleModel.trim()) return toast.error('Vehicle model is required');
    if (!form.registrationNumber.trim()) return toast.error('Registration number is required');
    if (!form.vehicleCategory) return toast.error('Select the vehicle category — Car or Bike');

    setSaving(true);
    try {
      const customer = await customersService.create({
        customerName: form.customerName,
        phone: form.phone,
        whatsappNumber: form.whatsappNumber || null,
        alternateMobile: form.alternateMobile || null,
        email: form.email || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        pincode: form.pincode || null,
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
        vehicleCategory: form.vehicleCategory || null,
        sizeClass: form.sizeClass || null,
        insuranceCompany: form.insuranceCompany || null,
        insuranceExpiry: form.insuranceExpiry || null,
        pucExpiry: form.pucExpiry || null,
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
          <label className="form-label" htmlFor="cvm-customerName">Customer Name *</label>
          <input id="cvm-customerName" className="form-control" value={form.customerName} onChange={(e) => set({ customerName: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-phone">Mobile Number *</label>
          <input id="cvm-phone" className="form-control" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-whatsapp">WhatsApp Number</label>
          <input id="cvm-whatsapp" className="form-control" value={form.whatsappNumber} onChange={(e) => set({ whatsappNumber: e.target.value })} placeholder="Same as mobile if left blank" />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-altMobile">Alternate Mobile</label>
          <input id="cvm-altMobile" className="form-control" value={form.alternateMobile} onChange={(e) => set({ alternateMobile: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-email">Email</label>
          <input id="cvm-email" type="email" className="form-control" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-city">City</label>
          <input id="cvm-city" className="form-control" value={form.city} onChange={(e) => set({ city: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-state">State</label>
          <input id="cvm-state" className="form-control" value={form.state} onChange={(e) => set({ state: e.target.value })} />
        </div>
        <div className="col-md-8">
          <label className="form-label" htmlFor="cvm-address">Address</label>
          <input id="cvm-address" className="form-control" value={form.address} onChange={(e) => set({ address: e.target.value })} />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="cvm-pincode">Pincode</label>
          <input id="cvm-pincode" className="form-control" value={form.pincode} onChange={(e) => set({ pincode: e.target.value })} />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="cvm-gstin">GSTIN</label>
          <input id="cvm-gstin" className="form-control" value={form.gstin} onChange={(e) => set({ gstin: e.target.value })} />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="cvm-custNotes">Notes</label>
          <input id="cvm-custNotes" className="form-control" value={form.customerNotes} onChange={(e) => set({ customerNotes: e.target.value })} />
        </div>
      </div>

      <h6 className="text-secondary text-uppercase small mb-2" style={{ letterSpacing: '0.04em' }}>Vehicle Details</h6>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-make">Make *</label>
          <input id="cvm-make" className="form-control" value={form.make} onChange={(e) => set({ make: e.target.value })} placeholder="e.g. Hyundai" />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-model">Model *</label>
          <input id="cvm-model" className="form-control" value={form.vehicleModel} onChange={(e) => set({ vehicleModel: e.target.value })} placeholder="e.g. Creta" />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-category">Category (Car / Bike) *</label>
          <select id="cvm-category" className="form-select" value={form.vehicleCategory} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select...</option>
            <option value="CAR">Car</option>
            <option value="BIKE">Bike</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-variant">Variant</label>
          <input id="cvm-variant" className="form-control" value={form.variant} onChange={(e) => set({ variant: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-reg">Registration Number *</label>
          <input id="cvm-reg" className="form-control" value={form.registrationNumber} onChange={(e) => set({ registrationNumber: e.target.value })} placeholder="e.g. TN 09 AB 4521" />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-odometer">Current Odometer (km)</label>
          <input id="cvm-odometer" type="number" min="0" className="form-control" value={form.odometer} onChange={(e) => set({ odometer: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-vehicleType">Vehicle Type</label>
          <select id="cvm-vehicleType" className="form-select" value={form.vehicleType} onChange={(e) => set({ vehicleType: e.target.value })} disabled={!form.vehicleCategory}>
            <option value="">{form.vehicleCategory ? 'Select...' : 'Select category first'}</option>
            {bodyTypeOptions(form.vehicleCategory).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-sizeClass">Size (affects service pricing)</label>
          <select id="cvm-sizeClass" className="form-select" value={form.sizeClass} onChange={(e) => set({ sizeClass: e.target.value })} disabled={!form.vehicleCategory}>
            <option value="">{form.vehicleCategory ? 'Select...' : 'Select category first'}</option>
            {sizeClassesFor(form.vehicleCategory).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-fuelType">Fuel Type</label>
          <select id="cvm-fuelType" className="form-select" value={form.fuelType} onChange={(e) => set({ fuelType: e.target.value })} disabled={!form.vehicleCategory}>
            <option value="">{form.vehicleCategory ? 'Select...' : 'Select category first'}</option>
            {fuelTypeOptions(form.vehicleCategory).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-color">Color</label>
          <input id="cvm-color" className="form-control" value={form.color} onChange={(e) => set({ color: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-year">Year</label>
          <input id="cvm-year" type="number" className="form-control" value={form.year} onChange={(e) => set({ year: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-chassis">VIN / Chassis Number</label>
          <input id="cvm-chassis" className="form-control" value={form.chassisNumber} onChange={(e) => set({ chassisNumber: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-engine">Engine Number</label>
          <input id="cvm-engine" className="form-control" value={form.engineNumber} onChange={(e) => set({ engineNumber: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-insCompany">Insurance Company</label>
          <input id="cvm-insCompany" className="form-control" value={form.insuranceCompany} onChange={(e) => set({ insuranceCompany: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-insExpiry">Insurance Expiry</label>
          <input id="cvm-insExpiry" type="date" className="form-control" value={form.insuranceExpiry} onChange={(e) => set({ insuranceExpiry: e.target.value })} />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="cvm-pucExpiry">PUC Expiry</label>
          <input id="cvm-pucExpiry" type="date" className="form-control" value={form.pucExpiry} onChange={(e) => set({ pucExpiry: e.target.value })} />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="cvm-vehicleNotes">Notes</label>
          <input id="cvm-vehicleNotes" className="form-control" value={form.vehicleNotes} onChange={(e) => set({ vehicleNotes: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}
