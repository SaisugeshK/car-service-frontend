import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// HRM/payroll — before the EMPLOYEE role existed, every authenticated non-SUPER_ADMIN user was
// implicitly MANAGER-level and saw the full operational app (Job Cards, Invoices, Customers,
// ...). Adding EMPLOYEE as a real login role means that assumption breaks unless something
// explicitly fences it off: an EMPLOYEE must see only "My Payslips", never the rest of the ERP.
// This wraps every operational route (everything except /my-payslips itself); RequireSuperAdmin
// still layers on top of this for the owner-level screens.
export default function RequireOperationalAccess() {
  const { isEmployee } = useAuth();

  if (isEmployee) {
    return <Navigate to="/my-payslips" replace />;
  }

  return <Outlet />;
}
