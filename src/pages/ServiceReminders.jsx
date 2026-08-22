import { useEffect, useState } from 'react';
import { FiMessageCircle, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';
import CrudPage from './CrudPage';
import serviceRemindersService from '../services/serviceRemindersService';
import vehiclesService from '../services/vehiclesService';
import notificationsService from '../services/notificationsService';
import { serviceReminderSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const REMINDER_TYPES = [
  { value: 'NEXT_SERVICE', label: 'Next Service' },
  { value: 'OIL_CHANGE', label: 'Oil Change' },
  { value: 'INSURANCE_EXPIRY', label: 'Insurance Expiry' },
  { value: 'PUC_EXPIRY', label: 'PUC Expiry' },
  { value: 'TYRE_REPLACEMENT', label: 'Tyre Replacement' },
  { value: 'BATTERY', label: 'Battery' },
  { value: 'GENERAL_SERVICE', label: 'General Service' },
];
const TYPE_LABEL = Object.fromEntries(REMINDER_TYPES.map((t) => [t.value, t.label]));

// Reused for every reminder row's Send buttons — same honest WhatsApp/SMS abstraction as
// Estimates/Reviews (Phase 5/13): no provider is configured, so this reports NOT_CONFIGURED
// rather than pretending a message went out.
async function sendReminder(row, channel) {
  const channelLabel = channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS';
  try {
    const recipientPhone = channel === 'WHATSAPP' ? (row.customerWhatsapp || row.customerPhone) : row.customerPhone;
    const message = `Hi ${row.customerName || ''}, a reminder that your ${row.vehicleModel || 'vehicle'} (${row.registrationNumber || ''}) has ${(TYPE_LABEL[row.reminderType] || 'a service').toLowerCase()} due${row.dueDate ? ` on ${row.dueDate}` : ''}. Please contact us to schedule.`;
    const log = await notificationsService.send({
      channel, recipientPhone, referenceType: 'SERVICE_REMINDER', referenceId: row.reminderId,
      subject: `${TYPE_LABEL[row.reminderType] || 'Service'} reminder`, message,
    });
    if (log.status === 'NOT_CONFIGURED') toast(`${channelLabel} isn't configured on the server yet`, { icon: '⚠️' });
    else if (log.status === 'FAILED') toast.error(log.errorMessage || `${channelLabel} send failed`);
    else toast.success(`${channelLabel} sent`);
  } catch {
    toast.error('Could not reach the server — please try again');
  }
}

export default function ServiceReminders() {
  const [vehicles, setVehicles] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoadError(false);
    vehiclesService
      .getAll()
      .then((data) => setVehicles(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setLoadError(true));
  };

  useEffect(load, []);

  if (loadError) return <ErrorPage message="Could not load vehicles. Check your connection and try again." onRetry={load} />;
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
    defaultValues: { vehicleId: '', reminderType: 'NEXT_SERVICE', dueDate: '', dueOdometer: '', notes: '', status: 'UPCOMING' },
    schema: serviceReminderSchema,
    columns: [
      { key: 'customerName', label: 'Customer' },
      {
        key: 'vehicleModel',
        label: 'Vehicle',
        render: (row) => `${row.vehicleModel || ''} · ${row.registrationNumber || ''}`,
      },
      { key: 'reminderType', label: 'Type', render: (row) => <span className="badge bg-secondary">{TYPE_LABEL[row.reminderType] || row.reminderType}</span> },
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
      {
        key: 'send',
        label: 'Send',
        render: (row) => (
          <div className="d-flex gap-1">
            <button className="btn btn-sm btn-outline-secondary" title="Send via WhatsApp" onClick={(e) => { e.stopPropagation(); sendReminder(row, 'WHATSAPP'); }}>
              <FiMessageCircle size={13} />
            </button>
            <button className="btn btn-sm btn-outline-secondary" title="Send via SMS" onClick={(e) => { e.stopPropagation(); sendReminder(row, 'SMS'); }}>
              <FiMessageSquare size={13} />
            </button>
          </div>
        ),
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
      { name: 'reminderType', label: 'Reminder Type', type: 'select', required: true, options: REMINDER_TYPES },
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
