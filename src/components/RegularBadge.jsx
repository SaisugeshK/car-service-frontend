import { REGULAR_STATUS } from '../services/visitsService';

// ⭐ Regular / 🕑 Occasional / 🆕 New — the customer's visit-based status from the server.
export default function RegularBadge({ status, short = false, className = '' }) {
  const meta = REGULAR_STATUS[status] || REGULAR_STATUS.NEW;
  return (
    <span className={`badge ${meta.badge} ${className}`} title={meta.label}>
      <span aria-hidden="true">{meta.icon}</span> {short ? meta.short : meta.label}
    </span>
  );
}
