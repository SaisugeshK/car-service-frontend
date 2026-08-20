import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../layouts/MainLayout';

import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';

// Workshop
import Appointments from '../pages/Appointments';
import JobCards from '../pages/JobCards';
import JobCardDetail from '../pages/JobCardDetail';
import WorkshopBoard from '../pages/WorkshopBoard';
import Inspections from '../pages/Inspections';

// Customers
import Customers from '../pages/Customers';
import CustomerDetail from '../pages/CustomerDetail';
import Vehicles from '../pages/Vehicles';

// Catalog
import Services from '../pages/Services';
import Products from '../pages/Products';
import Categories from '../pages/Categories';

// Inventory
import InventoryStock from '../pages/InventoryStock';
import Purchases from '../pages/Purchases';
import Suppliers from '../pages/Suppliers';
import StockAdjustments from '../pages/StockAdjustments';

// Billing
import Estimates from '../pages/Estimates';
import Invoices from '../pages/Invoices';
import Payments from '../pages/Payments';
import Returns from '../pages/Returns';

// Customer relationship
import ServiceReminders from '../pages/ServiceReminders';
import Followups from '../pages/Followups';

import Reports from '../pages/Reports';
import Settings from '../pages/Settings';
import ProductTaxes from '../pages/ProductTaxes';
import Users from '../pages/Users';
import Roles from '../pages/Roles';

// Legacy — kept mounted but unlinked from the sidebar. Their tables/APIs/data are untouched;
// these detail-record screens are just no longer part of the day-to-day workshop workflow
// (Job Card -> Estimate -> Invoice generates what used to require managing these by hand).
import Barcodes from '../pages/Barcodes';
import Units from '../pages/Units';
import PurchaseItems from '../pages/PurchaseItems';
import PurchaseReturns from '../pages/PurchaseReturns';
import PurchaseReturnItems from '../pages/PurchaseReturnItems';
import InvoiceItems from '../pages/InvoiceItems';
import Sales from '../pages/Sales';
import SalesItems from '../pages/SalesItems';
import SalesReturns from '../pages/SalesReturns';
import SalesReturnItems from '../pages/SalesReturnItems';
import HoldInvoices from '../pages/HoldInvoices';
import BillingCounters from '../pages/BillingCounters';
import CashClosing from '../pages/CashClosing';
import StockMovements from '../pages/StockMovements';
import PointOfSale from '../pages/PointOfSale';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />

          <Route path="/appointments" element={<Appointments />} />
          <Route path="/job-cards" element={<JobCards />} />
          <Route path="/job-cards/:id" element={<JobCardDetail />} />
          <Route path="/workshop-board" element={<WorkshopBoard />} />
          <Route path="/inspections" element={<Inspections />} />

          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/vehicles" element={<Vehicles />} />

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

          <Route path="/service-reminders" element={<ServiceReminders />} />
          <Route path="/follow-ups" element={<Followups />} />

          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/product-taxes" element={<ProductTaxes />} />
          <Route path="/users" element={<Users />} />
          <Route path="/roles" element={<Roles />} />

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

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
