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
  FiTrendingDown,
  FiLogIn,
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
    items: [{ to: '/', label: 'Dashboard', icon: FiGrid, end: true, employee: true }],
  },
  {
    title: 'Workshop',
    items: [
      { to: '/appointments', label: 'Appointments', icon: FiCalendar, employee: true },
      { to: '/job-cards', label: 'Job Cards', icon: FiClipboard, employee: true },
      { to: '/workshop-board', label: 'Workshop Board', icon: FiTrello, employee: true },
      { to: '/inspections', label: 'Inspections', icon: FiCheckSquare, employee: true },
    ],
  },
  {
    title: 'Customers',
    items: [
      { to: '/customers', label: 'Customers', icon: FiUserCheck, employee: true },
      { to: '/vehicles', label: 'Vehicles', icon: FaCarSide, employee: true },
      { to: '/visits', label: 'Customer Visits', employeeLabel: 'My Visits', icon: FiLogIn, employee: true },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { to: '/service-master', label: 'Services', icon: FiTool, employee: true },
      { to: '/products', label: 'Products / Parts', icon: FiBox, employee: true },
      { to: '/categories', label: 'Categories', icon: FiTag, employee: true },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { to: '/stock', label: 'Stock', icon: FiPackage, employee: true },
      { to: '/purchases', label: 'Purchases', icon: FiShoppingCart, employee: true },
      { to: '/suppliers', label: 'Suppliers', icon: FiTruck, employee: true },
      { to: '/stock-adjustments', label: 'Stock Adjustments', icon: FiSliders, employee: true },
    ],
  },
  {
    title: 'Billing',
    items: [
      { to: '/invoices', label: 'Invoices', icon: FiFileText },
      { to: '/payments', label: 'Payments', icon: FiCreditCard },
      { to: '/returns', label: 'Returns', icon: FiRotateCcw },
    ],
  },
  {
    // Outgoing costs — kept apart from Billing (revenue) so employees can record what they spend
    // without seeing any revenue. They get their own entries only, as "My Expenses".
    title: 'Expenses',
    items: [{ to: '/expenses', label: 'Expenses', employeeLabel: 'My Expenses', icon: FiTrendingDown, employee: true }],
  },
  {
    title: 'Customer Relationship',
    items: [
      { to: '/service-reminders', label: 'Service Reminders', icon: FiBell },
      { to: '/follow-ups', label: 'Follow-ups', icon: FiPhoneCall },
      { to: '/reviews', label: 'Reviews', icon: FiStar },
      { to: '/offers', label: 'Offers', icon: FiGift },
      { to: '/complaints', label: 'Complaints', icon: FiAlertCircle, employee: true },
    ],
  },
  {
    // HRM/payroll management — SUPER_ADMIN only. An EMPLOYEE gets the separate minimal nav
    // below, bypassing NAV_GROUPS entirely.
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

  // An EMPLOYEE sees the items flagged `employee: true` (workshop, reference data, complaints) plus
  // their own records — never billing, CRM, offers, payroll management, reports or settings.
  // RequireOperationalAccess and the backend enforce the same split; this avoids dead links.
  const employeeGroups = [
    ...NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.employee).map((item) => ({ ...item, label: item.employeeLabel || item.label })),
    }))
      .filter((group) => group.items.length > 0),
    {
      title: 'My Account',
      items: [
        { to: '/my-attendance', label: 'My Attendance & Leave', icon: FiCalendarCheck, end: true },
        { to: '/my-payslips', label: 'My Payslips', icon: FiDollarSign, end: true },
      ],
    },
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
