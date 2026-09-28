import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiLogOut, FiChevronDown, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { NAV_GROUPS } from './Sidebar';
import GlobalSearch from '../components/GlobalSearch';
import NotificationCenter from '../components/NotificationCenter';

function findRouteMeta(pathname) {
  if (pathname.startsWith('/job-cards/')) return { group: 'Workshop', label: 'Job Card' };
  if (pathname === '/my-payslips') return { group: 'My Account', label: 'My Payslips' };
  if (pathname === '/my-attendance') return { group: 'My Account', label: 'My Attendance' };
  for (const group of NAV_GROUPS) {
    const item = group.items.find((i) => i.to === pathname);
    if (item) return { group: group.title, label: item.label };
  }
  return { group: 'Overview', label: pathname === '/' ? 'Dashboard' : 'Page' };
}

function initialsOf(text) {
  if (!text) return 'A';
  const parts = text.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] || 'A').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
}

export default function Navbar({ onToggleSidebar }) {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const meta = findRouteMeta(location.pathname);
  const displayName = user?.username || user?.email || 'Admin';

  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="erp-navbar">
      <button className="btn btn-light border-0 p-2" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <FiMenu size={20} />
      </button>

      <div>
        <h1 className="erp-navbar-title">{meta.label}</h1>
        <div className="erp-navbar-breadcrumb">
          Home / {meta.group} / {meta.label}
        </div>
      </div>

      <div className="ms-auto d-flex align-items-center gap-2">
        {/* Search and notifications read customers/jobs/invoices/stock — management data an
            EMPLOYEE has no access to (the API would refuse it anyway). */}
        {isSuperAdmin && <GlobalSearch />}

        {isSuperAdmin && <NotificationCenter />}

        <div className="position-relative" ref={menuRef}>
          <button
            className="btn btn-light border-0 d-flex align-items-center gap-2 px-2"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <div className="erp-avatar">{initialsOf(displayName)}</div>
            <div className="d-none d-md-block text-start">
              <div className="small fw-semibold lh-1">{user?.username || 'Admin'}</div>
              <div className="text-secondary lh-1" style={{ fontSize: '0.72rem' }}>
                {user?.email || 'admin@example.com'}
              </div>
            </div>
            <FiChevronDown size={14} className="text-secondary d-none d-md-block" />
          </button>

          {menuOpen && (
            <div
              className="erp-card position-absolute end-0 mt-2 py-1"
              style={{ minWidth: 200, zIndex: 30 }}
            >
              <div className="px-3 py-2 border-bottom">
                <div className="small fw-semibold">{user?.username || 'Admin'}</div>
                <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{user?.email || 'admin@example.com'}</div>
              </div>
              <button
                className="btn btn-light border-0 w-100 text-start d-flex align-items-center gap-2 px-3 py-2 rounded-0"
                onClick={() => setMenuOpen(false)}
              >
                <FiUser size={14} /> Profile
              </button>
              <button
                className="btn btn-light border-0 w-100 text-start d-flex align-items-center gap-2 px-3 py-2 rounded-0 text-danger"
                onClick={handleLogout}
              >
                <FiLogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
