import { Link } from 'react-router-dom';
import { FiAlertCircle } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-center py-5">
      <FiAlertCircle size={48} className="text-warning mb-3" />
      <h2>404 - Page Not Found</h2>
      <p className="text-muted">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary mt-2">
        Back to Dashboard
      </Link>
    </div>
  );
}
