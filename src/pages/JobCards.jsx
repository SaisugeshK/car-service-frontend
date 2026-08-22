import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiPlus } from 'react-icons/fi';
import jobCardsService from '../services/jobCardsService';
import customersService from '../services/customersService';
import vehiclesService from '../services/vehiclesService';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const STATUS_BADGE = {
  RECEIVED: 'bg-secondary',
  INSPECTION: 'bg-info text-dark',
  ESTIMATE: 'bg-info text-dark',
  WAITING_APPROVAL: 'bg-warning text-dark',
  APPROVED: 'bg-primary',
  IN_PROGRESS: 'bg-primary',
  WAITING_FOR_PARTS: 'bg-warning text-dark',
  QUALITY_CHECK: 'bg-warning text-dark',
  READY_FOR_DELIVERY: 'bg-success',
  DELIVERED: 'bg-success',
  CANCELLED: 'bg-danger',
};

export default function JobCards() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vehicleFilter = searchParams.get('vehicleId');
  const [jobCards, setJobCards] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [complaint, setComplaint] = useState('');
  const [odometer, setOdometer] = useState('');

  const load = () => {
    setLoadError(false);
    return jobCardsService
      .getAll()
      .then((data) => setJobCards(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setLoadError(true));
  };

  const loadAll = () => {
    load();
    Promise.all([customersService.getAll(), vehiclesService.getAll()])
      .then(([c, v]) => {
        setCustomers(Array.isArray(c) ? c : c?.content || []);
        setVehicles(Array.isArray(v) ? v : v?.content || []);
      })
      .catch(() => setLoadError(true));
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customerVehicles = useMemo(
    () => vehicles.filter((v) => String(v.customerId) === String(customerId)),
    [vehicles, customerId]
  );

  const filtered = useMemo(() => {
    if (!jobCards) return [];
    let list = jobCards;
    if (vehicleFilter) list = list.filter((j) => String(j.vehicleId) === String(vehicleFilter));
    if (typeFilter !== 'ALL') list = list.filter((j) => j.vehicleCategory === typeFilter);
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (j) =>
        j.jobCardNumber?.toLowerCase().includes(q) ||
        j.customerName?.toLowerCase().includes(q) ||
        j.registrationNumber?.toLowerCase().includes(q) ||
        j.status?.toLowerCase().includes(q)
    );
  }, [jobCards, search, vehicleFilter, typeFilter]);

  const openCreate = () => {
    setCustomerId('');
    setVehicleId('');
    setComplaint('');
    setOdometer('');
    setShowForm(true);
  };

  const handleCreate = async () => {
    if (!customerId) return toast.error('Please select a customer');
    if (!vehicleId) return toast.error('Please select a vehicle');
    setIsSaving(true);
    try {
      const jobCard = await jobCardsService.create({
        customerId: Number(customerId),
        vehicleId: Number(vehicleId),
        complaint,
        odometer: odometer ? Number(odometer) : null,
      });
      toast.success(`Job card ${jobCard.jobCardNumber} created`);
      setShowForm(false);
      navigate(`/job-cards/${jobCard.jobCardId}`);
    } catch {
      // Global toast already shown by the axios interceptor.
    } finally {
      setIsSaving(false);
    }
  };

  if (loadError) return <ErrorPage message="Could not load job cards. Check your connection and try again." onRetry={loadAll} />;
  if (!jobCards) return <Loader label="Loading job cards..." />;

  return (
    <div>
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title mb-0">Job Cards</h1>
          {vehicleFilter && (
            <div className="small text-secondary">
              Showing this vehicle&apos;s history — <Link to="/job-cards">clear filter</Link>
            </div>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="btn-group" role="group" aria-label="Filter by vehicle type">
            {['ALL', 'CAR', 'BIKE'].map((v) => (
              <button
                key={v}
                type="button"
                className={`btn btn-sm ${typeFilter === v ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setTypeFilter(v)}
              >
                {v === 'ALL' ? 'All' : v === 'CAR' ? 'Car' : 'Bike'}
              </button>
            ))}
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Search job cards..." />
          <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openCreate}>
            <FiPlus /> New Job Card
          </button>
        </div>
      </div>

      <DataTable
        rows={filtered}
        keyField="jobCardId"
        emptyTitle="No job cards yet"
        emptyMessage='Click "New Job Card" when a vehicle arrives at the workshop.'
        onRowClick={(row) => navigate(`/job-cards/${row.jobCardId}`)}
        columns={[
          { key: 'jobCardNumber', label: 'Job Card #', sortable: true },
          { key: 'customerName', label: 'Customer' },
          {
            key: 'vehicleModel',
            label: 'Vehicle',
            render: (row) => (
              <>
                {row.vehicleModel || ''} · {row.registrationNumber || ''}
                {row.vehicleCategory && (
                  <span className={`badge ms-1 ${row.vehicleCategory === 'BIKE' ? 'bg-info' : 'bg-secondary'}`}>
                    {row.vehicleCategory}
                  </span>
                )}
              </>
            ),
          },
          { key: 'complaint', label: 'Complaint' },
          { key: 'technicianName', label: 'Technician', render: (row) => row.technicianName || '—' },
          {
            key: 'status',
            label: 'Status',
            render: (row) => <span className={`badge ${STATUS_BADGE[row.status] || 'bg-secondary'}`}>{row.status}</span>,
          },
        ]}
      />

      <Modal
        show={showForm}
        title="New Job Card"
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Job Card'}
            </button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label" htmlFor="jc-customer">Customer *</label>
          <select
            id="jc-customer"
            className="form-select"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setVehicleId('');
            }}
          >
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customerName} {c.phone ? `(${c.phone})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="jc-vehicle">Vehicle *</label>
          <select id="jc-vehicle" className="form-select" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} disabled={!customerId}>
            <option value="">{customerId ? 'Select vehicle...' : 'Select a customer first'}</option>
            {customerVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicleModel} · {v.registrationNumber}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="jc-odometer">Odometer (km)</label>
          <input id="jc-odometer" type="number" min="0" className="form-control" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="jc-complaint">Customer Complaint</label>
          <textarea id="jc-complaint" className="form-control" rows={3} value={complaint} onChange={(e) => setComplaint(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
