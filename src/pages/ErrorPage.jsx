import { Link } from 'react-router-dom';
import { FiXCircle } from 'react-icons/fi';

// onRetry lets an inline (non-navigation) failure — e.g. a list page whose data fetch failed —
// offer "try again in place" instead of forcing a trip back to the dashboard. When omitted,
// behavior is exactly what it always was (Back to Dashboard only).
export default function ErrorPage({ message, onRetry }) {
  return (
    <div className="erp-state text-center">
      <div className="erp-state-icon erp-state-icon-danger">
        <FiXCircle size={22} />
      </div>
      <h2 className="h5 mb-1">Something went wrong</h2>
      <p className="text-secondary small mb-3">{message || 'An unexpected error occurred. Please try again.'}</p>
      <div className="d-flex justify-content-center gap-2">
        {onRetry && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try Again
          </button>
        )}
        <Link to="/" className={`btn ${onRetry ? 'btn-outline-secondary' : 'btn-primary'}`}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
