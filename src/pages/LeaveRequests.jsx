import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { FiCheck, FiX } from 'react-icons/fi';
import CrudPage from './CrudPage';
import leaveRequestsService from '../services/leaveRequestsService';
import usersService from '../services/usersService';
import { leaveRequestSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

// HRM/payroll — leave requests (spec §8). Only APPROVED leave ever reaches payroll; PENDING/
// REJECTED never affect pay. Approve/Reject reload the page — a full reload is a deliberate
// simplification here (this list changes rarely and the action is admin-only), avoiding wiring a
// second refresh channel into CrudPage's own internal list state just for this.
export default function LeaveRequests() {
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
      toast.success(`Leave request ${label}`);
      window.location.reload();
    } catch {
      // axios interceptor already toasts the error
    }
  };

  const config = {
    title: 'Leave Requests',
    entityName: 'Leave Request',
    service: leaveRequestsService,
    searchKeys: [],
    defaultValues: { userId: '', leaveType: 'PAID', startDate: dayjs().format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD'), reason: '' },
    schema: leaveRequestSchema,
    columns: [
      { key: 'leaveId', label: 'ID', sortable: true },
      { key: 'userId', label: 'Employee', render: (row) => row.userName || userName(row.userId) },
      { key: 'leaveType', label: 'Type', render: (row) => <span className={`badge ${row.leaveType === 'PAID' ? 'bg-info text-dark' : 'bg-warning text-dark'}`}>{row.leaveType}</span> },
      { key: 'startDate', label: 'From', render: (row) => dayjs(row.startDate).format('DD MMM YYYY') },
      { key: 'endDate', label: 'To', render: (row) => dayjs(row.endDate).format('DD MMM YYYY') },
      { key: 'numberOfDays', label: 'Days' },
      { key: 'reason', label: 'Reason', render: (row) => row.reason || '—' },
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
                  <button className="btn btn-sm btn-outline-success" title="Approve" onClick={() => act(leaveRequestsService.approve, row.leaveId, 'approved')}>
                    <FiCheck size={13} />
                  </button>
                  <button className="btn btn-sm btn-outline-danger" title="Reject" onClick={() => act(leaveRequestsService.reject, row.leaveId, 'rejected')}>
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
      {
        name: 'leaveType',
        label: 'Leave Type',
        type: 'select',
        required: true,
        options: [
          { value: 'PAID', label: 'Paid Leave' },
          { value: 'UNPAID', label: 'Unpaid Leave' },
        ],
      },
      { name: 'startDate', label: 'Start Date', type: 'date', required: true },
      { name: 'endDate', label: 'End Date', type: 'date', required: true },
      { name: 'reason', label: 'Reason', type: 'textarea', fullWidth: true },
    ],
  };

  return <CrudPage config={config} />;
}
