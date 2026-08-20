import useGlobalLoading from '../hooks/useGlobalLoading';

export default function GlobalLoadingBar() {
  const isLoading = useGlobalLoading();
  if (!isLoading) return null;

  return (
    <div className="position-fixed top-0 start-0 w-100" style={{ height: 3, zIndex: 2000 }}>
      <div className="progress" style={{ height: 3, borderRadius: 0 }}>
        <div
          className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
