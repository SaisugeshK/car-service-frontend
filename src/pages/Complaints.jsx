import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import CrudPage from './CrudPage';
import complaintsService from '../services/complaintsService';
import customersService from '../services/customersService';
import vehiclesService from '../services/vehiclesService';
import jobCardsService from '../services/jobCardsService';
import usersService from '../services/usersService';
import { useAuth } from '../context/AuthContext';
import { complaintSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

const TYPE_OPTIONS = [
  { value: 'SERVICE_QUALITY', label: 'Service Quality' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'DELAY', label: 'Delay' },
  { value: 'STAFF_BEHAVIOR', label: 'Staff Behavior' },
  { value: 'PARTS', label: 'Parts' },
  { value: 'OTHER', label: 'Other' },
];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => ({ value: p, label: p.charAt(0) + p.slice(1).toLowerCase() }));
const PRIORITY_TONE = { LOW: 'bg-secondary', MEDIUM: 'bg-info text-dark', HIGH: 'bg-warning text-dark', URGENT: 'bg-danger' };
const STATUS_TONE = { OPEN: 'bg-danger', IN_PROGRESS: 'bg-warning text-dark', RESOLVED: 'bg-success', CLOSED: 'bg-secondary' };

export default function Complaints() {
  const { isSuperAdmin } = useAuth();
  const [customers, setCustomers] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [jobCards, setJobCards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoadError(false);
    customersService.getAll().then((data) => setCustomers(asList(data))).catch(() => setLoadError(true));
    vehiclesService.getAll().then((data) => setVehicles(asList(data)));
    jobCardsService.getAll().then((data) => setJobCards(asList(data)));
    // GET /api/users is SUPER_ADMIN-only — only used for the assignee dropdown/name lookup, so an
    // EMPLOYEE doesn't call it at all (the 403 would otherwise land in their console every visit).
    if (isSuperAdmin) {
      usersService.getAll(undefined, { skipErrorToast: true }).then((data) => setUsers(asList(data))).catch(() => setUsers([]));
    }
  };

  useEffect(load, [isSuperAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) return <ErrorPage message="Could not load complaints. Check your connection and try again." onRetry={load} />;
  if (!customers) return <Loader label="Loading complaints..." />;

  const config = {
    title: 'Customer Complaints',
    entityName: 'Complaint',
    service: complaintsService,
    // Employees can log complaints (not edit or delete them).
    employeeCanCreate: true,
    searchKeys: ['description', 'customerName'],
    defaultValues: {
      customerId: '', vehicleId: '', jobCardId: '', type: 'OTHER', description: '',
      priority: 'MEDIUM', assignedToUserId: '', status: 'OPEN', resolution: '', resolutionDate: '',
    },
    schema: complaintSchema,
    segments: [
      { value: 'ALL', label: 'All' },
      { value: 'OPEN', label: 'Open', predicate: (row) => row.status === 'OPEN' },
      { value: 'IN_PROGRESS', label: 'In Progress', predicate: (row) => row.status === 'IN_PROGRESS' },
      { value: 'RESOLVED', label: 'Resolved', predicate: (row) => row.status === 'RESOLVED' },
      { value: 'CLOSED', label: 'Closed', predicate: (row) => row.status === 'CLOSED' },
    ],
    columns: [
      { key: 'customerName', label: 'Customer' },
      { key: 'vehicleModel', label: 'Vehicle', render: (row) => row.vehicleModel ? `${row.vehicleModel} (${row.registrationNumber || ''})` : '—' },
      { key: 'type', label: 'Type', render: (row) => (TYPE_OPTIONS.find((t) => t.value === row.type)?.label) || row.type || '—' },
      { key: 'description', label: 'Description', render: (row) => (row.description?.length > 50 ? `${row.description.slice(0, 50)}…` : row.description) },
      { key: 'priority', label: 'Priority', render: (row) => <span className={`badge ${PRIORITY_TONE[row.priority] || 'bg-secondary'}`}>{row.priority}</span> },
      { key: 'assignedToName', label: 'Assigned To', render: (row) => row.assignedToName || '—' },
      { key: 'status', label: 'Status', render: (row) => <span className={`badge ${STATUS_TONE[row.status] || 'bg-secondary'}`}>{row.status?.replace('_', ' ')}</span> },
      { key: 'createdAt', label: 'Date', render: (row) => (row.createdAt ? dayjs(row.createdAt).format('DD MMM YYYY') : '—') },
    ],
    fields: [
      { name: 'customerId', label: 'Customer', type: 'select', required: true, valueKey: 'id', labelKey: 'customerName', options: customers },
      {
        name: 'vehicleId', label: 'Vehicle', type: 'select', valueKey: 'vehicleId', labelKey: 'vehicleModel',
        options: vehicles.map((v) => ({ vehicleId: v.vehicleId, vehicleModel: `${v.vehicleModel} (${v.registrationNumber || ''})` })),
      },
      {
        name: 'jobCardId', label: 'Job Card', type: 'select', valueKey: 'jobCardId', labelKey: 'jobCardNumber', options: jobCards,
      },
      { name: 'type', label: 'Type', type: 'select', options: TYPE_OPTIONS },
      { name: 'priority', label: 'Priority', type: 'select', options: PRIORITY_OPTIONS },
      { name: 'description', label: 'Description', type: 'textarea', required: true, fullWidth: true },
      {
        name: 'assignedToUserId', label: 'Assigned To', type: 'select', valueKey: 'id', labelKey: 'fullName',
        options: users.map((u) => ({ id: u.id, fullName: u.fullName || u.username })),
      },
      {
        name: 'status', label: 'Status', type: 'select',
        options: [
          { value: 'OPEN', label: 'Open' },
          { value: 'IN_PROGRESS', label: 'In Progress' },
          { value: 'RESOLVED', label: 'Resolved' },
          { value: 'CLOSED', label: 'Closed' },
        ],
      },
      { name: 'resolution', label: 'Resolution', type: 'textarea', fullWidth: true, showIf: (v) => v.status === 'RESOLVED' || v.status === 'CLOSED' },
      { name: 'resolutionDate', label: 'Resolution Date', type: 'date', showIf: (v) => v.status === 'RESOLVED' || v.status === 'CLOSED' },
    ],
  };

  return <CrudPage config={config} />;
}
