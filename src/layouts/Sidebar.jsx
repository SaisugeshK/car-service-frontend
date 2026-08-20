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
} from 'react-icons/fi';
import { FaCarSide } from 'react-icons/fa';

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
    ],
  },
  {
    title: 'Reports',
    items: [{ to: '/reports', label: 'Reports', icon: FiPieChart }],
  },
  {
    title: 'Settings',
    items: [
      { to: '/settings', label: 'Business Settings', icon: FiSettings },
      { to: '/product-taxes', label: 'Tax / GST', icon: FiPercent },
      { to: '/users', label: 'Users', icon: FiUsers },
      { to: '/roles', label: 'Roles', icon: FiShield },
    ],
  },
];

export default function Sidebar({ collapsed, onNavigate }) {
  return (
    <aside className={`erp-sidebar ${collapsed ? 'erp-sidebar-collapsed' : ''}`}>
      <div className="erp-sidebar-brand">
        <div className="erp-sidebar-brand-icon">
          <FiTool size={18} />
        </div>
        {!collapsed && (
          <div className="erp-sidebar-brand-text">
            <span className="erp-sidebar-brand-name">AUTOCARE</span>
            <span className="erp-sidebar-brand-sub">Service Management</span>
          </div>
        )}
      </div>
      <nav className="erp-sidebar-nav">
        {NAV_GROUPS.map((group) => (
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
