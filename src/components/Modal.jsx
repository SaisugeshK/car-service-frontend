import { useEffect } from 'react';

export default function Modal({ show, title, onClose, children, footer, size = '', tone = 'primary' }) {
  useEffect(() => {
    if (!show) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div className={`modal-dialog modal-dialog-centered ${size}`} role="document">
          <div className="modal-content erp-card">
            <div className={`modal-header modal-header-${tone}`}>
              <h5 className="modal-title">{title}</h5>
              {/* Bootstrap's .btn-close already paints its own X via a CSS background-image —
                  it used to also render a child <FiX /> icon on top of that, producing two
                  overlapping close glyphs. */}
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
