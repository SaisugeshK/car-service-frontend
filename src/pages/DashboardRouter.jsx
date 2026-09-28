import { useAuth } from '../context/AuthContext';
import SuperAdminDashboard from './SuperAdminDashboard';
import EmployeeDashboard from './EmployeeDashboard';

// SUPER_ADMIN gets the owner-level dashboard with revenue. An EMPLOYEE gets their own work —
// assigned job cards/appointments, attendance, payslips, complaints — never revenue or salary.
export default function DashboardRouter() {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <SuperAdminDashboard /> : <EmployeeDashboard />;
}
