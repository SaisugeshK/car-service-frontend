export default function Loader({ size = 'md', label = 'Loading...' }) {
  const dim = size === 'sm' ? '1.25rem' : size === 'lg' ? '3rem' : '2rem';
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-4 text-muted">
      <div
        className="spinner-border text-primary"
        style={{ width: dim, height: dim }}
        role="status"
      >
        <span className="visually-hidden">{label}</span>
      </div>
      {size !== 'sm' && <small className="mt-2">{label}</small>}
    </div>
  );
}
