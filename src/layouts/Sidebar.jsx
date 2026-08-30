import { NavLink } from 'react-router-dom';
import {
  FiGrid,
  FiTool,
  FiUserCheck,
  FiCalendar,
  FiClipboard,
  FiTrello,
  FiCheckSquare,
  FiTag,
  FiBox,
  FiPackage,
  FiShoppingCart,
  FiTruck,
  FiSliders,
  FiFileText,
  FiCreditCard,
  FiRotateCcw,
  FiBell,
  FiPhoneCall,
  FiPieChart,
  FiSettings,
  FiPercent,
  FiUsers,
  FiShield,
  FiStar,
  FiGift,
  FiAlertCircle,
  FiActivity,
  FiUserPlus,
  FiCalendar as FiCalendarCheck,
  FiClock,
  FiDollarSign,
} from 'react-icons/fi';
import { FaCarSide } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useCompanyProfile } from '../context/CompanyProfileContext';

// Workshop-focused structure — one entry per business concept, not per database table. Legacy
// modules (Barcodes, Units, Product Taxes, Purchase/Sales Items, Invoice Items, Sales, Billing
// Counters, Cash Closing, manual Stock Movements) are intentionally not linked here: their data,
// APIs and tables are untouched, but users no longer manage them directly — Job Card/Estimate/
// Invoice/Purchase now generate those detail records automatically.
export const NAV_GROUPS = [
  {
    title: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: FiGrid, end: true }],
  },
  {
    title: 'Workshop',
    items: [
      { to: '/appointments', label: 'Appointments', icon: FiCalendar },
      { to: '/job-cards', label: 'Job Cards', icon: FiClipboard },
      { to: '/workshop-board', label: 'Workshop Board', icon: FiTrello },
      { to: '/inspections', label: 'Inspections', icon: FiCheckSquare },
    ],
  },
  {
    title: 'Customers',
    items: [
      { to: '/customers', label: 'Customers', icon: FiUserCheck },
      { to: '/vehicles', label: 'Vehicles', icon: FaCarSide },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { to: '/service-master', label: 'Services', icon: FiTool },
      { to: '/products', label: 'Products / Parts', icon: FiBox },
      { to: '/categories', label: 'Categories', icon: FiTag },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { to: '/stock', label: 'Stock', icon: FiPackage },
      { to: '/purchases', label: 'Purchases', icon: FiShoppingCart },
      { to: '/suppliers', label: 'Suppliers', icon: FiTruck },
      { to: '/stock-adjustments', label: 'Stock Adjustments', icon: FiSliders },
    ],
  },
  {
    title: 'Billing',
    items: [
      { to: '/estimates', label: 'Estimates', icon: FiFileText },
      { to: '/invoices', label: 'Invoices', icon: FiFileText },
      { to: '/payments', label: 'Payments', icon: FiCreditCard },
      { to: '/returns', label: 'Returns', icon: FiRotateCcw },
    ],
  },
  {
    title: 'Customer Relationship',
    items: [
      { to: '/service-reminders', label: 'Service Reminders', icon: FiBell },
      { to: '/follow-ups', label: 'Follow-ups', icon: FiPhoneCall },
      { to: '/reviews', label: 'Reviews', icon: FiStar },
      { to: '/offers', label: 'Offers', icon: FiGift },
      { to: '/complaints', label: 'Complaints', icon: FiAlertCircle },
    ],
  },
  {
    // HRM/payroll — SUPER_ADMIN + MANAGER (spec §23), same visibility as every other
    // non-superAdminOnly group here. Never shown to an EMPLOYEE login: Sidebar renders a
    // completely separate minimal nav for that role, below, bypassing NAV_GROUPS entirely.
    title: 'Payroll',
    items: [
      { to: '/attendance', label: 'Attendance', icon: FiCalendarCheck },
      { to: '/leave-requests', label: 'Leave Requests', icon: FiClock },
      { to: '/overtime', label: 'Overtime', icon: FiClock },
      { to: '/employee-salary', label: 'Employee Salary', icon: FiUserPlus },
      { to: '/payroll', label: 'Payroll Runs', icon: FiDollarSign },
    ],
  },
  {
    title: 'Reports',
    // Owner-level financial reporting — SUPER_ADMIN only per Phase 19 role spec.
    items: [{ to: '/reports', label: 'Reports', icon: FiPieChart, superAdminOnly: true }],
  },
  {
    title: 'Settings',
    items: [
      { to: '/settings', label: 'Business Settings', icon: FiSettings, superAdminOnly: true },
      { to: '/product-taxes', label: 'Tax / GST', icon: FiPercent },
      { to: '/users', label: 'Users', icon: FiUsers, superAdminOnly: true },
      { to: '/roles', label: 'Roles', icon: FiShield, superAdminOnly: true },
      { to: '/audit-log', label: 'Audit Log', icon: FiActivity, superAdminOnly: true },
    ],
  },
];

export default function Sidebar({ collapsed, onNavigate }) {
  const { isSuperAdmin, isEmployee } = useAuth();
  const { companyName, tagline, logo } = useCompanyProfile();
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.superAdminOnly || isSuperAdmin),
  })).filter((group) => group.items.length > 0);

  // HRM/payroll — an EMPLOYEE login sees only "My Payslips", never the operational nav above
  // (RequireOperationalAccess enforces this at the route level too — this is just so the sidebar
  // doesn't dangle links an EMPLOYEE would immediately get redirected away from).
  const employeeGroups = [
    { title: 'Overview', items: [{ to: '/my-payslips', label: 'My Payslips', icon: FiDollarSign, end: true }] },
  ];

  return (
    <aside className={`erp-sidebar ${collapsed ? 'erp-sidebar-collapsed' : ''}`}>
      <div className="erp-sidebar-brand">
        {logo ? (
          <img src={logo} alt={`${companyName} logo`} className="erp-sidebar-brand-icon" style={{ objectFit: 'cover' }} />
        ) : (
          <div className="erp-sidebar-brand-icon">
            <FiTool size={18} />
          </div>
        )}
        {!collapsed && (
          <div className="erp-sidebar-brand-text">
            <span className="erp-sidebar-brand-name">{companyName}</span>
            <span className="erp-sidebar-brand-sub">{tagline || 'Service Management'}</span>
          </div>
        )}
      </div>
      <nav className="erp-sidebar-nav">
        {(isEmployee ? employeeGroups : visibleGroups).map((group) => (
          <div key={group.title} className="mb-3">
            {!collapsed && <div className="erp-sidebar-group-title">{group.title}</div>}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `erp-sidebar-link ${isActive ? 'active' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={16} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
