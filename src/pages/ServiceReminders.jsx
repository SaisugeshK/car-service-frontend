import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import serviceRemindersService from '../services/serviceRemindersService';
import vehiclesService from '../services/vehiclesService';
import { serviceReminderSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

export default function ServiceReminders() {
  const [vehicles, setVehicles] = useState(null);

  useEffect(() => {
    vehiclesService.getAll().then((data) => setVehicles(Array.isArray(data) ? data : data?.content || []));
  }, []);

  if (!vehicles) return <Loader label="Loading vehicles..." />;

  const config = {
    title: 'Service Reminders',
    entityName: 'Reminder',
    service: serviceRemindersService,
    searchKeys: ['customerName', 'registrationNumber', 'vehicleModel'],
    segments: [
      { value: 'ALL', label: 'All' },
      { value: 'OVERDUE', label: 'Overdue', predicate: (row) => row.status === 'OVERDUE' },
      { value: 'DUE', label: 'Due', predicate: (row) => row.status === 'DUE' },
      { value: 'UPCOMING', label: 'Upcoming', predicate: (row) => row.status === 'UPCOMING' },
    ],
    defaultValues: { vehicleId: '', dueDate: '', dueOdometer: '', notes: '', status: 'UPCOMING' },
    schema: serviceReminderSchema,
    columns: [
      { key: 'customerName', label: 'Customer' },
      {
        key: 'vehicleModel',
        label: 'Vehicle',
        render: (row) => `${row.vehicleModel || ''} · ${row.registrationNumber || ''}`,
      },
      { key: 'dueDate', label: 'Due Date', sortable: true },
      { key: 'dueOdometer', label: 'Due Odometer', render: (row) => (row.dueOdometer != null ? `${row.dueOdometer} km` : '—') },
      {
        key: 'status',
        label: 'Status',
        render: (row) => {
          const tone = row.status === 'OVERDUE' ? 'bg-danger' : row.status === 'DUE' ? 'bg-warning text-dark' : row.status === 'DONE' ? 'bg-success' : 'bg-info text-dark';
          return <span className={`badge ${tone}`}>{row.status}</span>;
        },
      },
    ],
    fields: [
      {
        name: 'vehicleId',
        label: 'Vehicle',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'vehicleModel',
        options: vehicles,
      },
      { name: 'dueDate', label: 'Due Date', type: 'date' },
      { name: 'dueOdometer', label: 'Due Odometer (km)', type: 'number' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'UPCOMING', label: 'Upcoming' },
          { value: 'DONE', label: 'Done' },
        ],
      },
      { name: 'notes', label: 'Notes', fullWidth: true },
    ],
  };

  return <CrudPage config={config} />;
}
