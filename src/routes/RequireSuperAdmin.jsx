import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// Phase 19 — route-level guard for the SUPER_ADMIN-only screens (Users, Roles, Settings,
// Reports). Sidebar already hides these links for MANAGER, but a direct URL must be
// blocked too — the sidebar hiding it is cosmetic, not a security boundary on its own.
// Backend still enforces the same rule independently on /api/users, /api/roles,
// /api/settings (hasRole("SUPER_ADMIN")) — this is UX, not the real gate.
export default function RequireSuperAdmin() {
  const { isSuperAdmin } = useAuth();

  // toast.error() updates react-hot-toast's own store — calling it straight in the render body
  // trips React's "Cannot update a component while rendering a different component" warning
  // (it's a side effect, not a pure render). useEffect defers it to after commit, same UX,
  // no console noise on every blocked navigation.
  useEffect(() => {
    if (!isSuperAdmin) toast.error("You don't have permission to view that page.");
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
