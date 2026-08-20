import { FiInbox } from 'react-icons/fi';

export default function EmptyState({
  title = 'No records found',
  message = 'There is nothing to show here yet.',
  action = null,
}) {
  return (
    <div className="text-center py-5 text-muted">
      <FiInbox size={42} className="mb-3 opacity-50" />
      <h6 className="mb-1">{title}</h6>
      <p className="mb-3 small">{message}</p>
      {action}
    </div>
  );
}
