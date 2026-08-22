import { useAuth } from '../context/AuthContext';
import SuperAdminDashboard from './SuperAdminDashboard';
import ManagerDashboard from './ManagerDashboard';

// SUPER_ADMIN gets the owner-level dashboard (Phase 20); MANAGER gets the operational
// dashboard (Phase 21) — today's jobs/approvals/QC/complaints/reminders/workload, no
// revenue or financial-report figures.
export default function DashboardRouter() {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <SuperAdminDashboard /> : <ManagerDashboard />;
}
