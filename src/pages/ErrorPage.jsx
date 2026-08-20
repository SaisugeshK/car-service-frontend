import { Link } from 'react-router-dom';
import { FiXCircle } from 'react-icons/fi';

export default function ErrorPage({ message }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-center py-5">
      <FiXCircle size={48} className="text-danger mb-3" />
      <h2>Something went wrong</h2>
      <p className="text-muted">{message || 'An unexpected error occurred. Please try again.'}</p>
      <Link to="/" className="btn btn-primary mt-2">
        Back to Dashboard
      </Link>
    </div>
  );
}
