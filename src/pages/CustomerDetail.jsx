import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiChevronRight } from 'react-icons/fi';
import { FaCarSide } from 'react-icons/fa';
import customersService from '../services/customersService';
import vehiclesService from '../services/vehiclesService';
import AddVehicleModal from '../components/AddVehicleModal';
import Loader from '../components/Loader';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [vehicles, setVehicles] = useState(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  const load = () => {
    customersService.getById(id).then(setCustomer);
    vehiclesService.getByCustomer(id).then((data) => setVehicles(Array.isArray(data) ? data : data?.content || []));
  };

  useEffect(load, [id]);

  if (!customer || !vehicles) return <Loader label="Loading customer..." />;

  return (
    <div>
      <button className="btn btn-light border-0 p-1 mb-2" onClick={() => navigate('/customers')}>
        <FiArrowLeft size={14} /> All Customers
      </button>
      <div className="erp-page-header">
        <h1 className="erp-page-title">{customer.customerName}</h1>
      </div>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="erp-card p-3">
            <h6 className="mb-3">Customer Information</h6>
            <dl className="row mb-0 small">
              <dt className="col-4 text-secondary fw-normal">Mobile</dt><dd className="col-8">{customer.phone || '—'}</dd>
              <dt className="col-4 text-secondary fw-normal">Email</dt><dd className="col-8">{customer.email || '—'}</dd>
              <dt className="col-4 text-secondary fw-normal">Address</dt><dd className="col-8">{customer.address || '—'}</dd>
              <dt className="col-4 text-secondary fw-normal">City</dt><dd className="col-8">{customer.city || '—'}</dd>
              <dt className="col-4 text-secondary fw-normal">GSTIN</dt><dd className="col-8">{customer.gstin || '—'}</dd>
              <dt className="col-4 text-secondary fw-normal">Status</dt>
              <dd className="col-8">
                <span className={`badge ${String(customer.status).toLowerCase() === 'active' ? 'bg-success' : 'bg-secondary'}`}>{customer.status}</span>
              </dd>
              {customer.notes && (<><dt className="col-4 text-secondary fw-normal">Notes</dt><dd className="col-8">{customer.notes}</dd></>)}
            </dl>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="erp-card p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Vehicles</h6>
              <button className="btn btn-sm btn-primary d-flex align-items-center gap-1" onClick={() => setShowAddVehicle(true)}>
                <FiPlus size={13} /> Add Vehicle
              </button>
            </div>

            {vehicles.length === 0 ? (
              <p className="text-secondary small mb-0">No vehicles on file yet.</p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {vehicles.map((v) => (
                  <button
                    key={v.vehicleId}
                    className="btn btn-light border d-flex align-items-center justify-content-between text-start"
                    onClick={() => navigate(`/job-cards?vehicleId=${v.vehicleId}`)}
                  >
                    <span className="d-flex align-items-center gap-2">
                      <FaCarSide className="text-secondary" />
                      <span>
                        <span className="fw-semibold">{[v.make, v.vehicleModel].filter(Boolean).join(' ')}</span>
                        <span className="text-secondary"> — {v.registrationNumber}</span>
                        {v.odometer != null && <div className="text-secondary small">{v.odometer} km</div>}
                      </span>
                    </span>
                    <FiChevronRight className="text-secondary" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddVehicleModal
        show={showAddVehicle}
        customer={{ id: customer.id, customerName: customer.customerName }}
        onClose={() => setShowAddVehicle(false)}
        onCreated={() => {
          setShowAddVehicle(false);
          load();
        }}
      />
    </div>
  );
}
