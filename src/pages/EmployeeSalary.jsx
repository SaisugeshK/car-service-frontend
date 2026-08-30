import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import CrudPage from './CrudPage';
import salaryConfigService from '../services/salaryConfigService';
import usersService from '../services/usersService';
import { salaryConfigSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

// HRM/payroll — an employee's current pay terms (spec §4). One active row per employee; the
// backend rejects a second active config for the same user rather than overwriting silently.
// Deleting a row here actually deactivates it server-side (active=false) — payroll history and
// audit trail stay intact (spec §22).
export default function EmployeeSalary() {
  const [users, setUsers] = useState(null);

  useEffect(() => {
    usersService.getAll(undefined, { skipErrorToast: true })
      .then((data) => setUsers(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setUsers([]));
  }, []);

  if (!users) return <Loader label="Loading..." />;

  const userOptions = users.map((u) => ({ id: u.id, name: u.fullName || u.username }));
  const userName = (id) => userOptions.find((u) => u.id === id)?.name || id;

  const config = {
    title: 'Employee Salary',
    entityName: 'Salary Configuration',
    service: salaryConfigService,
    searchKeys: [],
    defaultValues: { userId: '', basicPay: '', hra: 0, otherAllowances: 0, deductions: 0, effectiveFrom: dayjs().format('YYYY-MM-DD'), notes: '' },
    schema: salaryConfigSchema,
    columns: [
      { key: 'salaryConfigId', label: 'ID', sortable: true },
      { key: 'userId', label: 'Employee', render: (row) => row.userName || userName(row.userId) },
      { key: 'roleName', label: 'Role', render: (row) => row.roleName || '—' },
      { key: 'basicPay', label: 'Basic Pay', render: (row) => Number(row.basicPay ?? 0).toFixed(2) },
      { key: 'hra', label: 'HRA', render: (row) => Number(row.hra ?? 0).toFixed(2) },
      { key: 'otherAllowances', label: 'Other Allowances', render: (row) => Number(row.otherAllowances ?? 0).toFixed(2) },
      { key: 'deductions', label: 'Deductions', render: (row) => Number(row.deductions ?? 0).toFixed(2) },
      { key: 'effectiveFrom', label: 'Effective From', render: (row) => dayjs(row.effectiveFrom).format('DD MMM YYYY') },
      {
        key: 'active',
        label: 'Status',
        render: (row) => <span className={`badge ${row.active ? 'bg-success' : 'bg-secondary'}`}>{row.active ? 'Active' : 'Inactive'}</span>,
      },
    ],
    fields: [
      { name: 'userId', label: 'Employee', type: 'select', required: true, valueKey: 'id', labelKey: 'name', options: userOptions },
      { name: 'basicPay', label: 'Basic Pay', type: 'number', step: '0.01', min: '0', required: true },
      { name: 'hra', label: 'HRA', type: 'number', step: '0.01', min: '0' },
      { name: 'otherAllowances', label: 'Other Allowances', type: 'number', step: '0.01', min: '0' },
      { name: 'deductions', label: 'Deductions', type: 'number', step: '0.01', min: '0' },
      { name: 'effectiveFrom', label: 'Effective From', type: 'date', required: true },
      { name: 'notes', label: 'Notes', type: 'textarea', fullWidth: true },
    ],
  };

  return <CrudPage config={config} />;
}
