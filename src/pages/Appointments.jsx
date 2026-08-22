import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiPlus, FiArrowRightCircle } from 'react-icons/fi';
import appointmentsService from '../services/appointmentsService';
import jobCardsService from '../services/jobCardsService';
import customersService from '../services/customersService';
import vehiclesService from '../services/vehiclesService';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';
import CustomerVehicleModal from '../components/CustomerVehicleModal';
import ErrorPage from './ErrorPage';

const STATUS_OPTIONS = ['BOOKED', 'CONFIRMED', 'ARRIVED', 'NO_SHOW', 'CANCELLED', 'COMPLETED'];
const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

const emptyForm = () => ({
  customerId: '', vehicleId: '', appointmentDate: '', appointmentTime: '',
  requestedService: '', notes: '', status: 'BOOKED',
});

export default function Appointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCombined, setShowCombined] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadAppointments = () => {
    setLoadError(false);
    return appointmentsService.getAll().then((data) => setAppointments(asList(data))).catch(() => setLoadError(true));
  };
  const loadCustomers = () => customersService.getAll().then((data) => setCustomers(asList(data)));
  const loadVehicles = () => vehiclesService.getAll().then((data) => setVehicles(asList(data)));

  useEffect(() => {
    loadAppointments();
    loadCustomers();
    loadVehicles();
  }, []);

  const customerVehicles = useMemo(
    () => vehicles.filter((v) => String(v.customerId) === String(form.customerId)),
    [vehicles, form.customerId]
  );
  const selectedCustomer = customers.find((c) => String(c.id) === String(form.customerId));
  const selectedVehicle = vehicles.find((v) => String(v.id) === String(form.vehicleId));

  const filtered = useMemo(() => {
    if (!appointments) return [];
    if (!search) return appointments;
    const q = search.toLowerCase();
    return appointments.filter(
      (a) =>
        a.customerName?.toLowerCase().includes(q) ||
        a.registrationNumber?.toLowerCase().includes(q) ||
        a.requestedService?.toLowerCase().includes(q) ||
        a.status?.toLowerCase().includes(q)
    );
  }, [appointments, search]);

  const openCreate = () => {
    setForm(emptyForm());
    setShowForm(true);
  };

  const selectCustomer = (customerId) => {
    // Changing customer always clears any previously chosen vehicle — a vehicle from another
    // customer must never stay selected (spec: never allow that combination).
    setForm((prev) => ({ ...prev, customerId, vehicleId: '' }));
  };

  const handleCreate = async () => {
    if (!form.customerId) return toast.error('Please select a customer');
    if (!form.vehicleId) return toast.error('Please select a vehicle');
    if (!form.appointmentDate) return toast.error('Please pick an appointment date');
    setSaving(true);
    try {
      await appointmentsService.create({
        customerId: Number(form.customerId),
        vehicleId: Number(form.vehicleId),
        phone: selectedCustomer?.phone || null,
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime || null,
        requestedService: form.requestedService,
        notes: form.notes,
        status: form.status,
      });
      toast.success('Appointment booked');
      setShowForm(false);
      loadAppointments();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  };

  const convertToJobCard = async (row) => {
    if (row.jobCardId) {
      navigate(`/job-cards/${row.jobCardId}`);
      return;
    }
    try {
      const jobCard = await jobCardsService.createFromAppointment(row.id);
      toast.success(`Job card ${jobCard.jobCardNumber} created`);
      navigate(`/job-cards/${jobCard.jobCardId}`);
    } catch {
      // toast already shown
    }
  };

  if (loadError) return <ErrorPage message="Could not load appointments. Check your connection and try again." onRetry={loadAppointments} />;
  if (!appointments) return <Loader label="Loading appointments..." />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Appointments</h1>
        <div className="d-flex align-items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search appointments..." />
          <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openCreate}>
            <FiPlus /> New Appointment
          </button>
        </div>
      </div>

      <DataTable
        rows={filtered}
        keyField="id"
        emptyTitle="No appointments yet"
        emptyMessage='Click "New Appointment" to book a customer in.'
        columns={[
          { key: 'customerName', label: 'Customer' },
          {
            key: 'vehicleModel',
            label: 'Vehicle',
            render: (row) => (row.vehicleModel ? `${row.vehicleModel} · ${row.registrationNumber || ''}` : '—'),
          },
          { key: 'appointmentDate', label: 'Date', sortable: true },
          { key: 'appointmentTime', label: 'Time' },
          { key: 'requestedService', label: 'Requested Service' },
          {
            key: 'status',
            label: 'Status',
            render: (row) => {
              const tone =
                row.status === 'COMPLETED' || row.status === 'ARRIVED'
                  ? 'bg-success'
                  : row.status === 'CANCELLED' || row.status === 'NO_SHOW'
                    ? 'bg-danger'
                    : 'bg-warning text-dark';
              return <span className={`badge ${tone}`}>{row.status}</span>;
            },
          },
          {
            key: 'jobCard',
            label: 'Job Card',
            render: (row) => (
              <button
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                onClick={() => convertToJobCard(row)}
                title={row.jobCardId ? 'Open job card' : 'Convert to job card'}
              >
                <FiArrowRightCircle size={13} /> {row.jobCardId ? 'Open' : 'Convert'}
              </button>
            ),
          },
        ]}
      />

      <Modal
        show={showForm}
        title="New Appointment"
        size="modal-lg"
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Booking...' : 'Book Appointment'}
            </button>
          </>
        }
      >
        <div className="row g-3">
          <div className="col-md-7">
            <label className="form-label">Customer *</label>
            <select className="form-select" value={form.customerId} onChange={(e) => selectCustomer(e.target.value)}>
              <option value="">Search customer by name/mobile...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.customerName} {c.phone ? `(${c.phone})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="col-md-5 d-flex align-items-end">
            <button type="button" className="btn btn-outline-primary w-100" onClick={() => setShowCombined(true)}>
              <FiPlus size={13} /> New Customer & Vehicle
            </button>
          </div>

          <div className="col-md-6">
            <label className="form-label">Phone</label>
            <input className="form-control" value={selectedCustomer?.phone || ''} readOnly disabled placeholder="Auto-filled from customer" />
          </div>
          <div className="col-md-6">
            <label className="form-label">Vehicle *</label>
            <select
              className="form-select"
              value={form.vehicleId}
              onChange={(e) => setForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
              disabled={!form.customerId}
            >
              <option value="">{form.customerId ? 'Select vehicle...' : 'Select a customer first'}</option>
              {customerVehicles.map((v) => (
                <option key={v.id} value={v.id}>{[v.make, v.vehicleModel].filter(Boolean).join(' ')} — {v.registrationNumber}</option>
              ))}
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label">Registration Number</label>
            <input className="form-control" value={selectedVehicle?.registrationNumber || ''} readOnly disabled placeholder="Auto-filled from vehicle" />
          </div>
          <div className="col-md-6">
            <label className="form-label">Current Odometer</label>
            <input className="form-control" value={selectedVehicle?.odometer != null ? `${selectedVehicle.odometer} km` : ''} readOnly disabled />
          </div>

          <div className="col-md-6">
            <label className="form-label">Appointment Date *</label>
            <input type="date" className="form-control" value={form.appointmentDate} onChange={(e) => setForm((prev) => ({ ...prev, appointmentDate: e.target.value }))} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Appointment Time</label>
            <input type="time" className="form-control" value={form.appointmentTime} onChange={(e) => setForm((prev) => ({ ...prev, appointmentTime: e.target.value }))} />
          </div>

          <div className="col-md-6">
            <label className="form-label">Requested Service</label>
            <input className="form-control" value={form.requestedService} onChange={(e) => setForm((prev) => ({ ...prev, requestedService: e.target.value }))} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="col-12">
            <label className="form-label">Notes</label>
            <textarea className="form-control" rows={2} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <CustomerVehicleModal
        show={showCombined}
        onClose={() => setShowCombined(false)}
        onCreated={async (customer, vehicle) => {
          setShowCombined(false);
          await Promise.all([loadCustomers(), loadVehicles()]);
          // Staff shouldn't have to search again — select the customer & vehicle they just made.
          setForm((prev) => ({ ...prev, customerId: String(customer.id), vehicleId: String(vehicle.id) }));
        }}
      />
    </div>
  );
}
