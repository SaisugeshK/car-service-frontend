import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import followUpsService from '../services/followUpsService';
import customersService from '../services/customersService';
import vehiclesService from '../services/vehiclesService';
import { followUpSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

const STATUS_OPTIONS = ['PENDING', 'CONTACTED', 'BOOKED', 'COMPLETED', 'NO_RESPONSE'];

export default function Followups() {
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    Promise.all([customersService.getAll(), vehiclesService.getAll()]).then(([c, v]) => {
      setRefs({
        customers: Array.isArray(c) ? c : c?.content || [],
        vehicles: Array.isArray(v) ? v : v?.content || [],
      });
    });
  }, []);

  if (!refs) return <Loader label="Loading references..." />;
  const { customers, vehicles } = refs;

  const config = {
    title: 'Customer Follow-ups',
    entityName: 'Follow-up',
    service: followUpsService,
    searchKeys: ['customerName', 'status'],
    defaultValues: { customerId: '', vehicleId: '', reminderDate: '', customerResponse: '', status: 'PENDING', notes: '' },
    schema: followUpSchema,
    columns: [
      {
        key: 'customerId',
        label: 'Customer',
        render: (row) => customers.find((c) => c.id === row.customerId)?.customerName || row.customerId,
      },
      {
        key: 'vehicleId',
        label: 'Vehicle',
        render: (row) => vehicles.find((v) => v.id === row.vehicleId)?.vehicleModel || '—',
      },
      { key: 'reminderDate', label: 'Reminder Date', sortable: true },
      {
        key: 'status',
        label: 'Status',
        render: (row) => {
          const tone = row.status === 'COMPLETED' || row.status === 'BOOKED' ? 'bg-success' : row.status === 'NO_RESPONSE' ? 'bg-danger' : 'bg-warning text-dark';
          return <span className={`badge ${tone}`}>{row.status}</span>;
        },
      },
    ],
    fields: [
      {
        name: 'customerId',
        label: 'Customer',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'customerName',
        options: customers,
      },
      {
        name: 'vehicleId',
        label: 'Vehicle',
        type: 'select',
        valueKey: 'id',
        labelKey: 'vehicleModel',
        options: vehicles,
      },
      { name: 'reminderDate', label: 'Reminder Date', type: 'date' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: STATUS_OPTIONS.map((s) => ({ value: s, label: s.replace('_', ' ') })),
      },
      { name: 'customerResponse', label: 'Customer Response', fullWidth: true },
      { name: 'notes', label: 'Notes', fullWidth: true },
    ],
  };

  return <CrudPage config={config} />;
}
