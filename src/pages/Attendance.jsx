import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import CrudPage from './CrudPage';
import attendanceService from '../services/attendanceService';
import usersService from '../services/usersService';
import { attendanceSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

// HRM/payroll — admin-facing attendance marking (spec §7). Feeds PayrollCalculationService's
// attendance-deduction math on the backend; there is no employee self-check-in flow in V1 (see
// the HRM plan's assumption 6 — attendance/leave/overtime are entered by SUPER_ADMIN/MANAGER).
export default function Attendance() {
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
    title: 'Attendance',
    entityName: 'Attendance Record',
    service: attendanceService,
    searchKeys: [],
    defaultValues: { userId: '', attendanceDate: dayjs().format('YYYY-MM-DD'), status: 'PRESENT', notes: '' },
    schema: attendanceSchema,
    columns: [
      { key: 'attendanceId', label: 'ID', sortable: true },
      { key: 'userId', label: 'Employee', render: (row) => row.userName || userName(row.userId) },
      { key: 'attendanceDate', label: 'Date', sortable: true, render: (row) => dayjs(row.attendanceDate).format('DD MMM YYYY') },
      {
        key: 'status',
        label: 'Status',
        render: (row) => (
          <span className={`badge ${row.status === 'PRESENT' ? 'bg-success' : row.status === 'ABSENT' ? 'bg-danger' : 'bg-secondary'}`}>
            {row.status}
          </span>
        ),
      },
      { key: 'notes', label: 'Notes', render: (row) => row.notes || '—' },
    ],
    fields: [
      { name: 'userId', label: 'Employee', type: 'select', required: true, valueKey: 'id', labelKey: 'name', options: userOptions },
      { name: 'attendanceDate', label: 'Date', type: 'date', required: true },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'PRESENT', label: 'Present' },
          { value: 'ABSENT', label: 'Absent' },
          { value: 'WEEK_OFF', label: 'Week Off' },
          { value: 'HOLIDAY', label: 'Holiday' },
        ],
      },
      { name: 'notes', label: 'Notes', type: 'textarea', fullWidth: true },
    ],
  };

  return <CrudPage config={config} />;
}
