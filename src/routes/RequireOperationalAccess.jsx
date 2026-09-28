import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NAV_GROUPS } from '../layouts/Sidebar';

// Pages an EMPLOYEE may open: every sidebar item flagged `employee: true`, plus the detail pages
// under them (a job card, a customer). Everything else is SUPER_ADMIN only. The backend enforces
// the same split (SecurityConfig) — this just keeps the UI from showing a page it would refuse.
const EMPLOYEE_PATHS = NAV_GROUPS.flatMap((g) => g.items).filter((i) => i.employee).map((i) => i.to);

const employeeCanOpen = (pathname) => EMPLOYEE_PATHS.some((p) => (p === '/'
  ? pathname === '/'
  : pathname === p || pathname.startsWith(`${p}/`)));

export default function RequireOperationalAccess() {
  const { isSuperAdmin } = useAuth();
  const { pathname } = useLocation();

  if (!isSuperAdmin && !employeeCanOpen(pathname)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
