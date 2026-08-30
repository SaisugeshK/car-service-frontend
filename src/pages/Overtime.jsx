import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { FiCheck, FiX } from 'react-icons/fi';
import CrudPage from './CrudPage';
import overtimeService from '../services/overtimeService';
import usersService from '../services/usersService';
import { overtimeSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

// HRM/payroll — overtime entries (spec §9). Only APPROVED entries are added to gross pay by
// PayrollCalculationService; amount = hours x rate, computed server-side, never trusted from the
// client. Approve/Reject reload the page — same deliberate simplification as LeaveRequests.jsx.
export default function Overtime() {
  const [users, setUsers] = useState(null);

  useEffect(() => {
    usersService.getAll(undefined, { skipErrorToast: true })
      .then((data) => setUsers(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setUsers([]));
  }, []);

  if (!users) return <Loader label="Loading..." />;

  const userOptions = users.map((u) => ({ id: u.id, name: u.fullName || u.username }));
  const userName = (id) => userOptions.find((u) => u.id === id)?.name || id;

  const act = async (action, id, label) => {
    try {
      await action(id);
      toast.success(`Overtime entry ${label}`);
      window.location.reload();
    } catch {
      // axios interceptor already toasts the error
    }
  };

  const config = {
    title: 'Overtime',
    entityName: 'Overtime Entry',
    service: overtimeService,
    searchKeys: [],
    defaultValues: { userId: '', workDate: dayjs().format('YYYY-MM-DD'), hours: '', rate: '', notes: '' },
    schema: overtimeSchema,
    columns: [
      { key: 'overtimeId', label: 'ID', sortable: true },
      { key: 'userId', label: 'Employee', render: (row) => row.userName || userName(row.userId) },
      { key: 'workDate', label: 'Date', render: (row) => dayjs(row.workDate).format('DD MMM YYYY') },
      { key: 'hours', label: 'Hours' },
      { key: 'rate', label: 'Rate', render: (row) => Number(row.rate ?? 0).toFixed(2) },
      { key: 'amount', label: 'Amount', render: (row) => Number(row.amount ?? 0).toFixed(2) },
      {
        key: 'status',
        label: 'Status',
        render: (row) => {
          const tone = row.status === 'APPROVED' ? 'bg-success' : row.status === 'REJECTED' ? 'bg-danger' : 'bg-secondary';
          return (
            <div className="d-flex align-items-center gap-2">
              <span className={`badge ${tone}`}>{row.status}</span>
              {row.status === 'PENDING' && (
                <div className="d-flex gap-1">
                  <button className="btn btn-sm btn-outline-success" title="Approve" onClick={() => act(overtimeService.approve, row.overtimeId, 'approved')}>
                    <FiCheck size={13} />
                  </button>
                  <button className="btn btn-sm btn-outline-danger" title="Reject" onClick={() => act(overtimeService.reject, row.overtimeId, 'rejected')}>
                    <FiX size={13} />
                  </button>
                </div>
              )}
            </div>
          );
        },
      },
    ],
    fields: [
      { name: 'userId', label: 'Employee', type: 'select', required: true, valueKey: 'id', labelKey: 'name', options: userOptions },
      { name: 'workDate', label: 'Date', type: 'date', required: true },
      { name: 'hours', label: 'Hours', type: 'number', step: '0.5', min: '0.5', required: true },
      { name: 'rate', label: 'Rate (per hour)', type: 'number', step: '0.01', min: '0', required: true },
      { name: 'notes', label: 'Notes', type: 'textarea', fullWidth: true },
    ],
  };

  return <CrudPage config={config} />;
}
