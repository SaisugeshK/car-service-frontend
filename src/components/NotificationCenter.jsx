import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  FiBell, FiUserCheck, FiClipboard, FiFileText, FiCheckCircle, FiXCircle,
  FiAlertTriangle, FiCreditCard, FiTruck, FiStar, FiClock, FiPackage, FiGift,
} from 'react-icons/fi';
import notificationEventsService from '../services/notificationEventsService';
import { DASHBOARD_TONES as T } from '../utils/dashboardTheme';

dayjs.extend(relativeTime);

const POLL_MS = 45000;

// Same tone palette as every dashboard's StatCard — a notification bell showing six unrelated
// hues for "new customer" vs "new job" vs "reminder" was decoration, not signal.
const TYPE_META = {
  NEW_CUSTOMER: { icon: FiUserCheck, color: T.brand.color },
  NEW_JOB: { icon: FiClipboard, color: T.brand.color },
  PENDING_INSPECTION: { icon: FiClock, color: T.warning.color },
  PENDING_ESTIMATE: { icon: FiFileText, color: T.warning.color },
  ESTIMATE_APPROVED: { icon: FiCheckCircle, color: T.success.color },
  ESTIMATE_REJECTED: { icon: FiXCircle, color: T.danger.color },
  ADDITIONAL_APPROVAL: { icon: FiAlertTriangle, color: T.warning.color },
  PAYMENT: { icon: FiCreditCard, color: T.success.color },
  READY_FOR_DELIVERY: { icon: FiTruck, color: T.success.color },
  REVIEW: { icon: FiStar, color: T.neutral.color },
  REMINDER: { icon: FiClock, color: T.warning.color },
  LOW_STOCK: { icon: FiPackage, color: T.danger.color },
  OFFER_CAMPAIGN_RESULT: { icon: FiGift, color: T.neutral.color },
};

// Where a notification takes you when clicked. JOB_CARD/CUSTOMER referenceId is the entity
// itself, so those deep-link directly; everything else lands on the relevant list — this app
// has no per-estimate/per-payment/etc. detail route, so a fake deep link would just 404.
const REFERENCE_ROUTE = {
  JOB_CARD: (id) => `/job-cards/${id}`,
  CUSTOMER: (id) => `/customers/${id}`,
  ESTIMATE: () => '/estimates',
  ADDITIONAL_WORK: () => '/job-cards',
  PAYMENT: () => '/payments',
  REVIEW: () => '/reviews',
  SERVICE_REMINDER: () => '/service-reminders',
  PRODUCT: () => '/stock',
  OFFER: () => '/offers',
};

export default function NotificationCenter() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const refreshUnreadCount = () => {
    notificationEventsService.getUnreadCount().then(setUnreadCount).catch(() => {});
  };

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const loadList = () => {
    setLoadError(false);
    notificationEventsService
      .getAll()
      .then((data) => setItems((Array.isArray(data) ? data : data?.content || []).slice(0, 25)))
      .catch(() => setLoadError(true));
  };

  const toggleOpen = () => {
    setOpen((o) => {
      const next = !o;
      if (next) loadList();
      return next;
    });
  };

  const openItem = (item) => {
    setOpen(false);
    if (!item.isRead) {
      notificationEventsService.markRead(item.notificationEventId).catch(() => {});
      setItems((prev) => prev.map((n) => (n.notificationEventId === item.notificationEventId ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    const routeFor = REFERENCE_ROUTE[item.referenceType];
    if (routeFor && item.referenceId) navigate(routeFor(item.referenceId));
  };

  const markAllRead = () => {
    notificationEventsService.markAllRead().then(() => {
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }).catch(() => {});
  };

  return (
    <div className="position-relative" ref={containerRef}>
      <button className="erp-navbar-icon-btn" title="Notifications" onClick={toggleOpen}>
        <FiBell size={16} />
        {unreadCount > 0 && (
          <span className="erp-dot d-flex align-items-center justify-content-center" style={{ width: 16, height: 16, fontSize: '0.6rem', fontWeight: 700, color: '#fff' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="erp-card position-absolute end-0 mt-2 py-1"
          style={{ minWidth: 340, maxWidth: 380, maxHeight: 440, overflowY: 'auto', zIndex: 40 }}
        >
          <div className="px-3 py-2 border-bottom d-flex align-items-center justify-content-between">
            <span className="fw-semibold small">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className="btn btn-link btn-sm p-0" style={{ fontSize: '0.76rem' }} onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {items === null && !loadError && <div className="px-3 py-3 small text-secondary">Loading...</div>}
          {loadError && (
            <div className="px-3 py-3 small text-secondary d-flex flex-column gap-2">
              Could not load notifications.
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={loadList}>Try Again</button>
            </div>
          )}
          {items !== null && items.length === 0 && !loadError && (
            <div className="px-3 py-3 small text-secondary">You&apos;re all caught up.</div>
          )}

          {items && items.map((item) => {
            const meta = TYPE_META[item.type] || { icon: FiBell, color: '#64748b' };
            const Icon = meta.icon;
            return (
              <button
                key={item.notificationEventId}
                type="button"
                className="btn btn-light border-0 w-100 text-start d-flex align-items-start gap-2 px-3 py-2 rounded-0"
                style={{ background: item.isRead ? 'transparent' : 'var(--erp-primary-light)' }}
                onClick={() => openItem(item)}
              >
                <span
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 30, height: 30, borderRadius: '50%', background: `${meta.color}1a` }}
                >
                  <Icon size={14} color={meta.color} />
                </span>
                <span className="flex-grow-1" style={{ minWidth: 0 }}>
                  <span className={`d-block small ${item.isRead ? '' : 'fw-semibold'}`}>{item.title}</span>
                  <span className="d-block text-secondary text-truncate" style={{ fontSize: '0.76rem' }}>{item.message}</span>
                  <span className="d-block text-secondary" style={{ fontSize: '0.68rem' }}>{dayjs(item.createdAt).fromNow()}</span>
                </span>
                {!item.isRead && <span className="flex-shrink-0 mt-1" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--erp-primary)' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
