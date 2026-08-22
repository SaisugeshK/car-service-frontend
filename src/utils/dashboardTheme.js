// One small, deliberate icon-color palette for every dashboard's StatCard — replaces what used
// to be six unrelated hues (blue, cyan, indigo, purple, amber, red) picked ad hoc per stat with
// no real meaning. Same values as index.css's --erp-* tokens, mirrored here since these are React
// inline styles, not CSS classes. Pick a tone by what the number actually MEANS, not by whim:
//
//   brand    — the default: a plain "here's a figure" stat (job count, revenue total, jobs today)
//   success  — something good/complete (ready for delivery, approved, cash collected)
//   warning  — needs attention soon, not urgent (in progress, waiting for parts, pending approval)
//   danger   — needs attention now (outstanding balance, low stock, open complaints)
//   neutral  — secondary/contextual info, de-emphasized on purpose (customer counts, review counts)
export const DASHBOARD_TONES = {
  brand: { color: '#9a7317', bg: 'rgba(154, 115, 23, 0.12)' },
  success: { color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
  warning: { color: '#b45309', bg: 'rgba(180, 83, 9, 0.1)' },
  danger: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' },
  neutral: { color: '#57534e', bg: 'rgba(87, 83, 78, 0.08)' },
};

export default DASHBOARD_TONES;
