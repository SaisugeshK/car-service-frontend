import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import GlobalLoadingBar from '../components/GlobalLoadingBar';

const MOBILE_BREAKPOINT = 992;

export default function MainLayout() {
  // On desktop, `collapsed` means "narrow icon-only rail". On mobile it means
  // "off-screen" (the sidebar becomes a full-width overlay when expanded) —
  // same flag, screen-size-appropriate meaning, driven entirely by CSS
  // (see .erp-sidebar rules in index.css). Start collapsed on small screens
  // so a phone/tablet load doesn't open with the sidebar covering the page.
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  );
  const location = useLocation();

  // Closing on route change matters only for the mobile overlay case; harmless no-op on desktop.
  useEffect(() => {
    if (window.innerWidth < MOBILE_BREAKPOINT) setCollapsed(true);
  }, [location.pathname]);

  return (
    <div className="erp-app-shell">
      <GlobalLoadingBar />
      <Sidebar collapsed={collapsed} onNavigate={() => window.innerWidth < MOBILE_BREAKPOINT && setCollapsed(true)} />
      {!collapsed && window.innerWidth < MOBILE_BREAKPOINT && (
        <div className="erp-sidebar-backdrop" onClick={() => setCollapsed(true)} />
      )}
      <div className="erp-main">
        <Navbar onToggleSidebar={() => setCollapsed((c) => !c)} />
        <main className="erp-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
