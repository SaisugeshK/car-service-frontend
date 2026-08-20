import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import CrudPage from './CrudPage';
import customersService from '../services/customersService';
import { customerSchema } from '../utils/validationSchemas';
import CustomerVehicleModal from '../components/CustomerVehicleModal';

export default function Customers() {
  const navigate = useNavigate();
  const [showCombined, setShowCombined] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const config = {
    title: 'Customers',
    entityName: 'Customer',
    service: customersService,
    searchKeys: ['customerName', 'phone', 'email', 'gstin'],
    // The plain "Add Customer" flow is replaced by the combined Customer & Vehicle form below —
    // a walk-in is never just a customer with no car. Edit still works for correcting details.
    hideAddButton: true,
    onRowClick: (row) => navigate(`/customers/${row.id}`),
    headerExtra: (
      <button className="btn btn-primary d-flex align-items-center gap-1" onClick={() => setShowCombined(true)}>
        <FiPlus /> Add Customer & Vehicle
      </button>
    ),
    defaultValues: {
      customerName: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      gstin: '',
      notes: '',
      status: 'active',
    },
    schema: customerSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'customerName', label: 'Customer', sortable: true },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'city', label: 'City' },
      {
        key: 'status',
        label: 'Status',
        render: (row) => (
          <span className={`badge ${String(row.status).toLowerCase() === 'active' ? 'bg-success' : 'bg-secondary'}`}>
            {row.status}
          </span>
        ),
      },
    ],
    fields: [
      { name: 'customerName', label: 'Name', required: true },
      { name: 'phone', label: 'Mobile', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'address', label: 'Address' },
      { name: 'city', label: 'City' },
      { name: 'gstin', label: 'GSTIN' },
      { name: 'notes', label: 'Notes', fullWidth: true },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      },
    ],
  };

  return (
    <>
      <CrudPage key={reloadTick} config={config} />
      <CustomerVehicleModal
        show={showCombined}
        onClose={() => setShowCombined(false)}
        onCreated={(customer) => {
          setShowCombined(false);
          setReloadTick((t) => t + 1);
          navigate(`/customers/${customer.id}`);
        }}
      />
    </>
  );
}
