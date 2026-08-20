import Modal from './Modal';
import { FiAlertTriangle } from 'react-icons/fi';

export default function ConfirmDialog({
  show,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  confirmVariant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      show={show}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button
            className={`btn btn-${confirmVariant}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="d-flex align-items-start gap-3">
        <FiAlertTriangle size={28} className="text-danger flex-shrink-0" />
        <p className="mb-0">{message}</p>
      </div>
    </Modal>
  );
}
