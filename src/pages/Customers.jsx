import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { FiPlus } from 'react-icons/fi';
import CrudPage from './CrudPage';
import customersService from '../services/customersService';
import { customerSchema } from '../utils/validationSchemas';
import CustomerVehicleModal from '../components/CustomerVehicleModal';
import RegularBadge from '../components/RegularBadge';
import { useAuth } from '../context/AuthContext';

export default function Customers() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
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
    headerExtra: isSuperAdmin ? (
      <button className="btn btn-primary d-flex align-items-center gap-1" onClick={() => setShowCombined(true)}>
        <FiPlus /> Add Customer & Vehicle
      </button>
    ) : null,
    segments: [
      { value: 'ALL', label: 'All' },
      { value: 'REGULAR', label: '⭐ Regular', predicate: (row) => row.regularStatus === 'REGULAR' },
      { value: 'OCCASIONAL', label: '🕑 Occasional', predicate: (row) => row.regularStatus === 'OCCASIONAL' },
      { value: 'NEW', label: '🆕 New', predicate: (row) => !row.regularStatus || row.regularStatus === 'NEW' },
    ],
    defaultValues: {
      customerName: '',
      phone: '',
      whatsappNumber: '',
      alternateMobile: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gstin: '',
      notes: '',
      status: 'active',
    },
    schema: customerSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      {
        key: 'customerName',
        label: 'Customer',
        sortable: true,
        render: (row) => (
          <span className="d-inline-flex align-items-center gap-2 flex-wrap">
            {row.customerName} <RegularBadge status={row.regularStatus} short />
          </span>
        ),
      },
      { key: 'phone', label: 'Phone' },
      { key: 'totalVisits', label: 'Visits', sortable: true, render: (row) => row.totalVisits ?? 0 },
      {
        key: 'lastVisitDate',
        label: 'Last Visit',
        sortable: true,
        render: (row) => (row.lastVisitDate ? dayjs(row.lastVisitDate).format('DD MMM YYYY') : '—'),
      },
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
      { name: 'whatsappNumber', label: 'WhatsApp Number' },
      { name: 'alternateMobile', label: 'Alternate Mobile' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'address', label: 'Address' },
      { name: 'city', label: 'City' },
      { name: 'state', label: 'State' },
      { name: 'pincode', label: 'Pincode' },
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
