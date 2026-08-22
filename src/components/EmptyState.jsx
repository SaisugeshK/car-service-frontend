import { FiInbox } from 'react-icons/fi';

export default function EmptyState({
  title = 'No records found',
  message = 'There is nothing to show here yet.',
  action = null,
}) {
  return (
    <div className="erp-state text-center">
      <div className="erp-state-icon erp-state-icon-neutral">
        <FiInbox size={22} />
      </div>
      <h6 className="mb-1">{title}</h6>
      <p className="mb-3 small text-secondary">{message}</p>
      {action}
    </div>
  );
}
