import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RequireSuperAdmin from './RequireSuperAdmin';
import RequireOperationalAccess from './RequireOperationalAccess';
import MainLayout from '../layouts/MainLayout';
import Loader from '../components/Loader';

// Every route below except Login/NotFound is lazy-loaded (Phase 26) — this app has ~40 page
// modules; loading them all upfront meant every login downloaded every module, including ones
// a given role (or a given day) never touches. Login/NotFound stay eager: they're tiny, and
// Login is the very first paint an unauthenticated user needs — no benefit to deferring it.
const Login = lazy(() => import('../pages/Login'));
const NotFound = lazy(() => import('../pages/NotFound'));
const DashboardRouter = lazy(() => import('../pages/DashboardRouter'));

// Workshop
const Appointments = lazy(() => import('../pages/Appointments'));
const JobCards = lazy(() => import('../pages/JobCards'));
const JobCardDetail = lazy(() => import('../pages/JobCardDetail'));
const WorkshopBoard = lazy(() => import('../pages/WorkshopBoard'));
const Inspections = lazy(() => import('../pages/Inspections'));

// Customers
const Customers = lazy(() => import('../pages/Customers'));
const CustomerDetail = lazy(() => import('../pages/CustomerDetail'));
const Vehicles = lazy(() => import('../pages/Vehicles'));
const Visits = lazy(() => import('../pages/Visits'));

// Catalog
const Services = lazy(() => import('../pages/Services'));
const Products = lazy(() => import('../pages/Products'));
const Categories = lazy(() => import('../pages/Categories'));

// Inventory
const InventoryStock = lazy(() => import('../pages/InventoryStock'));
const Purchases = lazy(() => import('../pages/Purchases'));
const Suppliers = lazy(() => import('../pages/Suppliers'));
const StockAdjustments = lazy(() => import('../pages/StockAdjustments'));

// Billing
const Estimates = lazy(() => import('../pages/Estimates'));
const Invoices = lazy(() => import('../pages/Invoices'));
const Payments = lazy(() => import('../pages/Payments'));
const Returns = lazy(() => import('../pages/Returns'));
const Expenses = lazy(() => import('../pages/Expenses'));

// Customer relationship
const ServiceReminders = lazy(() => import('../pages/ServiceReminders'));
const Followups = lazy(() => import('../pages/Followups'));
const Reviews = lazy(() => import('../pages/Reviews'));
const Offers = lazy(() => import('../pages/Offers'));
const Complaints = lazy(() => import('../pages/Complaints'));

const Reports = lazy(() => import('../pages/Reports'));
const Settings = lazy(() => import('../pages/Settings'));
const ProductTaxes = lazy(() => import('../pages/ProductTaxes'));
const Users = lazy(() => import('../pages/Users'));
const Roles = lazy(() => import('../pages/Roles'));
const AuditLog = lazy(() => import('../pages/AuditLog'));

// HRM/payroll
const AttendancePage = lazy(() => import('../pages/Attendance'));
const LeaveRequests = lazy(() => import('../pages/LeaveRequests'));
const OvertimePage = lazy(() => import('../pages/Overtime'));
const EmployeeSalary = lazy(() => import('../pages/EmployeeSalary'));
const PayrollRuns = lazy(() => import('../pages/PayrollRuns'));
const MyPayslips = lazy(() => import('../pages/MyPayslips'));
const MyAttendance = lazy(() => import('../pages/MyAttendance'));

// Legacy — kept mounted but unlinked from the sidebar. Their tables/APIs/data are untouched;
// these detail-record screens are just no longer part of the day-to-day workshop workflow
// (Job Card -> Estimate -> Invoice generates what used to require managing these by hand).
const Barcodes = lazy(() => import('../pages/Barcodes'));
const Units = lazy(() => import('../pages/Units'));
const PurchaseItems = lazy(() => import('../pages/PurchaseItems'));
const PurchaseReturns = lazy(() => import('../pages/PurchaseReturns'));
const PurchaseReturnItems = lazy(() => import('../pages/PurchaseReturnItems'));
const InvoiceItems = lazy(() => import('../pages/InvoiceItems'));
const Sales = lazy(() => import('../pages/Sales'));
const SalesItems = lazy(() => import('../pages/SalesItems'));
const SalesReturns = lazy(() => import('../pages/SalesReturns'));
const SalesReturnItems = lazy(() => import('../pages/SalesReturnItems'));
const HoldInvoices = lazy(() => import('../pages/HoldInvoices'));
const BillingCounters = lazy(() => import('../pages/BillingCounters'));
const CashClosing = lazy(() => import('../pages/CashClosing'));
const StockMovements = lazy(() => import('../pages/StockMovements'));
const PointOfSale = lazy(() => import('../pages/PointOfSale'));

const RouteFallback = () => (
  <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
    <Loader label="Loading..." />
  </div>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            {/* Employee self-service — the only pages an EMPLOYEE can reach; RequireOperationalAccess
                below sends any non-SUPER_ADMIN back to /my-payslips from everything else. */}
            <Route path="/my-payslips" element={<MyPayslips />} />
            <Route path="/my-attendance" element={<MyAttendance />} />

            <Route element={<RequireOperationalAccess />}>
            <Route path="/" element={<DashboardRouter />} />

            <Route path="/appointments" element={<Appointments />} />
            <Route path="/job-cards" element={<JobCards />} />
            <Route path="/job-cards/:id" element={<JobCardDetail />} />
            <Route path="/workshop-board" element={<WorkshopBoard />} />
            <Route path="/inspections" element={<Inspections />} />

            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/visits" element={<Visits />} />

            <Route path="/service-master" element={<Services />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />

            <Route path="/stock" element={<InventoryStock />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/stock-adjustments" element={<StockAdjustments />} />

            <Route path="/estimates" element={<Estimates />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/returns" element={<Returns />} />

            <Route path="/expenses" element={<Expenses />} />

            <Route path="/service-reminders" element={<ServiceReminders />} />
            <Route path="/follow-ups" element={<Followups />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/complaints" element={<Complaints />} />

            <Route path="/product-taxes" element={<ProductTaxes />} />

            {/* HRM/payroll management — SUPER_ADMIN only, via RequireOperationalAccess above. */}
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/leave-requests" element={<LeaveRequests />} />
            <Route path="/overtime" element={<OvertimePage />} />
            <Route path="/employee-salary" element={<EmployeeSalary />} />
            <Route path="/payroll" element={<PayrollRuns />} />

            {/* SUPER_ADMIN only — owner-level financial/system screens (Phase 19). */}
            <Route element={<RequireSuperAdmin />}>
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/users" element={<Users />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/audit-log" element={<AuditLog />} />
            </Route>

            {/* Legacy — unlinked, kept reachable by direct URL for historical data only */}
            <Route path="/barcodes" element={<Barcodes />} />
            <Route path="/units" element={<Units />} />
            <Route path="/purchase-items" element={<PurchaseItems />} />
            <Route path="/purchase-returns" element={<PurchaseReturns />} />
            <Route path="/purchase-return-items" element={<PurchaseReturnItems />} />
            <Route path="/invoice-items" element={<InvoiceItems />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/sales-items" element={<SalesItems />} />
            <Route path="/sales-returns" element={<SalesReturns />} />
            <Route path="/sales-return-items" element={<SalesReturnItems />} />
            <Route path="/hold-invoices" element={<HoldInvoices />} />
            <Route path="/billing-counters" element={<BillingCounters />} />
            <Route path="/cash-closing" element={<CashClosing />} />
            <Route path="/stock-movements" element={<StockMovements />} />
            <Route path="/pos" element={<PointOfSale />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
