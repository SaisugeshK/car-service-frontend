import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { FiPlus, FiPaperclip, FiEye, FiTrash2, FiEdit2, FiDownload } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import expensesService, {
  EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS, categoryLabel, paymentMethodLabel,
} from '../services/expensesService';
import invoicesService from '../services/invoicesService';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const RECEIPT_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
const MAX_RECEIPT_MB = 10;

const CATEGORY_BADGE = {
  UTILITIES: 'bg-info text-dark', RENT: 'bg-primary', MAINTENANCE: 'bg-warning text-dark',
  SUPPLIES: 'bg-success', MISCELLANEOUS: 'bg-secondary',
};

const EMPTY_FORM = {
  title: '', category: 'SUPPLIES', description: '', amount: '', paymentMethod: 'CASH',
  expenseDate: dayjs().format('YYYY-MM-DD'),
};

// Opens a receipt in a new tab. Fetched through axios as a blob — the API needs the Bearer header,
// which a plain link can't send.
async function openReceipt(expense) {
  const tab = window.open('', '_blank');
  try {
    const blob = await expensesService.getReceiptBlob(expense.expenseId);
    const url = URL.createObjectURL(blob);
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    if (tab) tab.close();
  }
}

// Expenses: outgoing non-revenue costs. A SUPER_ADMIN sees every entry, totals, category breakdown
// and expense-vs-revenue reports. An EMPLOYEE sees only "My Expenses" — the entries they created —
// with no totals; the server returns nothing else to them (ExpenseService).
export default function Expenses() {
  const { isSuperAdmin, user } = useAuth();
  const [expenses, setExpenses] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState('list');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [editing, setEditing] = useState(null); // null = closed, {} = new, row = edit
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoadError(false);
    expensesService.getAll()
      .then((data) => setExpenses(asList(data)))
      .catch(() => setLoadError(true));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!expenses) return [];
    const q = search.trim().toLowerCase();
    return expenses.filter((e) =>
      (!isSuperAdmin || (e.expenseDate >= from && e.expenseDate <= to))
      && (categoryFilter === 'ALL' || e.category === categoryFilter)
      && (!q || e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) || e.createdByName?.toLowerCase().includes(q)));
  }, [expenses, search, categoryFilter, from, to, isSuperAdmin]);

  const summary = useMemo(() => {
    const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
    const byCategory = EXPENSE_CATEGORIES.map((c) => ({
      ...c,
      amount: filtered.filter((e) => e.category === c.value).reduce((s, e) => s + Number(e.amount || 0), 0),
    })).sort((a, b) => b.amount - a.amount);
    const withoutReceipt = filtered.filter((e) => !e.hasReceipt).length;
    return { total, byCategory, count: filtered.length, withoutReceipt };
  }, [filtered]);

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await expensesService.remove(deleting.expenseId);
      toast.success('Expense deleted');
      setDeleting(null);
      load();
    } catch {
      // toast already shown
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <ErrorPage message="Could not load expenses. Check your connection and try again." onRetry={load} />;
  if (!expenses) return <Loader label="Loading expenses..." />;

  const columns = [
    { key: 'expenseDate', label: 'Date', sortable: true, render: (row) => dayjs(row.expenseDate).format('DD MMM YYYY') },
    {
      key: 'title',
      label: 'Expense',
      render: (row) => (
        <>
          <div className="fw-semibold">{row.title}</div>
          {row.description && <div className="small text-secondary text-truncate" style={{ maxWidth: 260 }}>{row.description}</div>}
        </>
      ),
    },
    { key: 'category', label: 'Category', render: (row) => <span className={`badge ${CATEGORY_BADGE[row.category] || 'bg-secondary'}`}>{categoryLabel(row.category)}</span> },
    { key: 'amount', label: 'Amount', sortable: true, render: (row) => <strong>{money(row.amount)}</strong> },
    { key: 'paymentMethod', label: 'Paid By', render: (row) => paymentMethodLabel(row.paymentMethod) },
    ...(isSuperAdmin ? [{
      key: 'createdByName',
      label: 'Created By',
      render: (row) => (
        <>
          {row.createdByName || '—'}{' '}
          <span className={`badge ${row.createdByRole === 'SUPER_ADMIN' ? 'bg-dark' : 'bg-light text-dark border'}`}>
            {row.createdByRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Employee'}
          </span>
        </>
      ),
    }] : []),
    {
      key: 'receipt',
      label: 'Receipt',
      render: (row) => (row.hasReceipt ? (
        <button type="button" className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1" onClick={(e) => { e.stopPropagation(); openReceipt(row); }}>
          <FiEye size={13} /> View
        </button>
      ) : <span className="text-secondary small">None</span>),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="d-flex gap-1">
          <button type="button" className="btn btn-sm btn-outline-primary" title="Edit" aria-label={`Edit ${row.title}`} onClick={(e) => { e.stopPropagation(); setEditing(row); }}>
            <FiEdit2 size={13} />
          </button>
          <button type="button" className="btn btn-sm btn-outline-danger" title="Delete" aria-label={`Delete ${row.title}`} onClick={(e) => { e.stopPropagation(); setDeleting(row); }}>
            <FiTrash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title">{isSuperAdmin ? 'Expenses' : 'My Expenses'}</h1>
          <div className="text-secondary small">
            {isSuperAdmin ? 'Outgoing costs — rent, utilities, maintenance, supplies and more.' : `Expenses you have recorded, ${user?.username || ''}.`}
          </div>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-1" onClick={() => setEditing({})}>
          <FiPlus /> Add Expense
        </button>
      </div>

      {isSuperAdmin && (
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item"><button className={`nav-link ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>All Expenses</button></li>
          <li className="nav-item"><button className={`nav-link ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>Reports</button></li>
        </ul>
      )}

      {tab === 'reports' && isSuperAdmin ? (
        <ExpenseReports expenses={expenses} />
      ) : (
        <>
          <div className="erp-card p-3 mb-3 d-flex flex-wrap align-items-center gap-2">
            {isSuperAdmin && (
              <div className="d-flex align-items-center gap-2">
                <input type="date" className="form-control form-control-sm" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
                <span className="text-secondary small">to</span>
                <input type="date" className="form-control form-control-sm" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
              </div>
            )}
            <select className="form-select form-select-sm" style={{ maxWidth: 190 }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Category">
              <option value="ALL">All categories</option>
              {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <div className="ms-auto"><SearchBar value={search} onChange={setSearch} placeholder="Search expenses..." /></div>
          </div>

          {isSuperAdmin && (
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <div className="erp-stat-card h-100">
                  <div className="text-secondary small">Total Expenses (selected period)</div>
                  <div className="erp-stat-value text-danger">{money(summary.total)}</div>
                  <div className="small text-secondary">{summary.count} entries · {summary.withoutReceipt} without receipt</div>
                </div>
              </div>
              <div className="col-md-8">
                <div className="erp-card p-3 h-100">
                  <h6 className="mb-2">By Category</h6>
                  <CategoryBars rows={summary.byCategory} total={summary.total} />
                </div>
              </div>
            </div>
          )}

          <DataTable
            keyField="expenseId"
            rows={filtered}
            columns={columns}
            emptyTitle={isSuperAdmin ? 'No expenses in this period' : 'No expenses yet'}
            emptyMessage='Click "Add Expense" to record a cost.'
          />
        </>
      )}

      {editing && (
        <ExpenseForm
          expense={editing.expenseId ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      <ConfirmDialog
        show={Boolean(deleting)}
        title="Delete this expense?"
        message={deleting ? `"${deleting.title}" (${money(deleting.amount)}) and its receipt will be permanently deleted.` : ''}
        isLoading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function CategoryBars({ rows, total }) {
  if (!total) return <p className="text-secondary small mb-0">No expenses in this period.</p>;
  return (
    <div className="d-flex flex-column gap-2">
      {rows.filter((r) => r.amount > 0).map((r) => {
        const pct = (r.amount / total) * 100;
        return (
          <div key={r.value} className="small">
            <div className="d-flex justify-content-between">
              <span>{r.label}</span>
              <span><strong>{money(r.amount)}</strong> <span className="text-secondary">({pct.toFixed(0)}%)</span></span>
            </div>
            <div className="progress" style={{ height: 8 }} role="progressbar" aria-label={`${r.label} ${pct.toFixed(0)}%`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className={`progress-bar ${(CATEGORY_BADGE[r.value] || 'bg-secondary').split(' ')[0]}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Add / Edit ---------------- */
function ExpenseForm({ expense, onClose, onSaved }) {
  const [form, setForm] = useState(() => (expense ? {
    title: expense.title,
    category: expense.category,
    description: expense.description || '',
    amount: expense.amount,
    paymentMethod: expense.paymentMethod,
    expenseDate: expense.expenseDate,
  } : EMPTY_FORM));
  const [file, setFile] = useState(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickFile = (e) => {
    const picked = e.target.files?.[0] || null;
    if (picked && picked.size > MAX_RECEIPT_MB * 1024 * 1024) {
      toast.error(`Receipt must be ${MAX_RECEIPT_MB} MB or smaller`);
      e.target.value = '';
      return;
    }
    setFile(picked);
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = 'Title is required';
    if (!(Number(form.amount) > 0)) next.amount = 'Enter an amount greater than 0';
    if (!form.expenseDate) next.expenseDate = 'Date is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), amount: Number(form.amount) };
      const saved = expense
        ? await expensesService.update(expense.expenseId, payload)
        : await expensesService.create(payload);
      if (file) {
        await expensesService.uploadReceipt(saved.expenseId, file);
      } else if (removeExisting && expense?.hasReceipt) {
        await expensesService.removeReceipt(saved.expenseId);
      }
      toast.success(expense ? 'Expense updated' : 'Expense recorded');
      onSaved();
    } catch {
      // toast already shown — if the receipt upload failed, the expense itself is saved
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show
      title={expense ? 'Edit Expense' : 'Add Expense'}
      onClose={() => !saving && onClose()}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </>
      }
    >
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label" htmlFor="exp-title">Expense Title <span className="text-danger">*</span></label>
          <input id="exp-title" className={`form-control ${errors.title ? 'is-invalid' : ''}`} value={form.title} onChange={set('title')} maxLength={150} placeholder="e.g. Electricity Bill, Workshop Cleaning" />
          {errors.title && <div className="invalid-feedback">{errors.title}</div>}
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="exp-category">Category <span className="text-danger">*</span></label>
          <select id="exp-category" className="form-select" value={form.category} onChange={set('category')}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="exp-amount">Amount (₹) <span className="text-danger">*</span></label>
          <input id="exp-amount" type="number" min="0.01" step="0.01" className={`form-control ${errors.amount ? 'is-invalid' : ''}`} value={form.amount} onChange={set('amount')} />
          {errors.amount && <div className="invalid-feedback">{errors.amount}</div>}
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="exp-method">Payment Method <span className="text-danger">*</span></label>
          <select id="exp-method" className="form-select" value={form.paymentMethod} onChange={set('paymentMethod')}>
            {EXPENSE_PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="exp-date">Date <span className="text-danger">*</span></label>
          <input id="exp-date" type="date" className={`form-control ${errors.expenseDate ? 'is-invalid' : ''}`} value={form.expenseDate} onChange={set('expenseDate')} max={dayjs().format('YYYY-MM-DD')} />
          {errors.expenseDate && <div className="invalid-feedback">{errors.expenseDate}</div>}
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="exp-desc">Description</label>
          <textarea id="exp-desc" className="form-control" rows={2} value={form.description} onChange={set('description')} placeholder="Optional notes" />
        </div>
        <div className="col-12">
          <label className="form-label d-flex align-items-center gap-1" htmlFor="exp-receipt"><FiPaperclip size={14} /> Receipt / Bill</label>
          {expense?.hasReceipt && !file && !removeExisting && (
            <div className="d-flex align-items-center gap-2 mb-2 small">
              <span className="text-truncate">{expense.receiptFileName || 'Receipt attached'}</span>
              <button type="button" className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1" onClick={() => openReceipt(expense)}>
                <FiDownload size={12} /> View
              </button>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRemoveExisting(true)}>Remove</button>
            </div>
          )}
          {removeExisting && (
            <div className="small text-danger mb-2">
              Receipt will be removed when you save.{' '}
              <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setRemoveExisting(false)}>Undo</button>
            </div>
          )}
          <input id="exp-receipt" type="file" className="form-control" accept={RECEIPT_ACCEPT} onChange={pickFile} />
          <div className="form-text">PDF, JPG, PNG or WEBP, up to {MAX_RECEIPT_MB} MB.{expense?.hasReceipt ? ' Choosing a file replaces the current receipt.' : ''}</div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Reports (SUPER_ADMIN) ---------------- */
function ExpenseReports({ expenses }) {
  const [invoices, setInvoices] = useState(null);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    invoicesService.getAll().then((data) => setInvoices(asList(data))).catch(() => setInvoices([]));
  }, []);

  const report = useMemo(() => {
    if (!invoices) return null;
    const periods = Array.from({ length: months }, (_, i) => dayjs().subtract(months - 1 - i, 'month').format('YYYY-MM'));
    const liveInvoices = invoices.filter((i) => i.status !== 'CANCELLED');
    const rows = periods.map((p) => {
      const expense = expenses.filter((e) => e.expenseDate?.slice(0, 7) === p).reduce((s, e) => s + Number(e.amount || 0), 0);
      const revenue = liveInvoices.filter((i) => dayjs(i.invoiceDate || i.createdAt).format('YYYY-MM') === p).reduce((s, i) => s + Number(i.grandTotal || 0), 0);
      return { period: p, label: dayjs(`${p}-01`).format('MMM YYYY'), revenue, expense, net: revenue - expense };
    });
    const max = Math.max(1, ...rows.map((r) => Math.max(r.revenue, r.expense)));
    const inWindow = expenses.filter((e) => periods.includes(e.expenseDate?.slice(0, 7)));
    const categoryTotal = inWindow.reduce((s, e) => s + Number(e.amount || 0), 0);
    const byCategory = EXPENSE_CATEGORIES.map((c) => ({
      ...c,
      amount: inWindow.filter((e) => e.category === c.value).reduce((s, e) => s + Number(e.amount || 0), 0),
    })).sort((a, b) => b.amount - a.amount);
    const totals = rows.reduce((t, r) => ({ revenue: t.revenue + r.revenue, expense: t.expense + r.expense, net: t.net + r.net }), { revenue: 0, expense: 0, net: 0 });
    return { rows, max, byCategory, categoryTotal, totals };
  }, [invoices, expenses, months]);

  if (!report) return <Loader label="Loading report..." />;

  return (
    <div>
      <div className="d-flex justify-content-end mb-3">
        <div className="btn-group" role="group" aria-label="Report period">
          {[3, 6, 12].map((m) => (
            <button key={m} type="button" className={`btn btn-sm ${months === m ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setMonths(m)}>
              Last {m} months
            </button>
          ))}
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-4"><div className="erp-stat-card"><div className="text-secondary small">Revenue</div><div className="erp-stat-value text-success">{money(report.totals.revenue)}</div></div></div>
        <div className="col-md-4"><div className="erp-stat-card"><div className="text-secondary small">Expenses</div><div className="erp-stat-value text-danger">{money(report.totals.expense)}</div></div></div>
        <div className="col-md-4"><div className="erp-stat-card"><div className="text-secondary small">Net (Revenue − Expenses)</div><div className={`erp-stat-value ${report.totals.net >= 0 ? 'text-success' : 'text-danger'}`}>{money(report.totals.net)}</div></div></div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="erp-card p-3 h-100">
            <h6 className="mb-1">Expense vs Revenue — Monthly</h6>
            <div className="d-flex gap-3 small text-secondary mb-3">
              <span><span className="d-inline-block rounded me-1 bg-success" style={{ width: 10, height: 10 }} />Revenue</span>
              <span><span className="d-inline-block rounded me-1 bg-danger" style={{ width: 10, height: 10 }} />Expenses</span>
            </div>
            <div className="d-flex flex-column gap-3">
              {report.rows.map((r) => (
                <div key={r.period} className="small">
                  <div className="d-flex justify-content-between mb-1">
                    <strong>{r.label}</strong>
                    <span className={r.net >= 0 ? 'text-success' : 'text-danger'}>Net {money(r.net)}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <div className="progress flex-grow-1" style={{ height: 8 }} aria-label={`Revenue ${r.label}`}>
                      <div className="progress-bar bg-success" style={{ width: `${(r.revenue / report.max) * 100}%` }} />
                    </div>
                    <span className="text-secondary" style={{ minWidth: 100, textAlign: 'right' }}>{money(r.revenue)}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <div className="progress flex-grow-1" style={{ height: 8 }} aria-label={`Expenses ${r.label}`}>
                      <div className="progress-bar bg-danger" style={{ width: `${(r.expense / report.max) * 100}%` }} />
                    </div>
                    <span className="text-secondary" style={{ minWidth: 100, textAlign: 'right' }}>{money(r.expense)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="erp-card p-3 h-100">
            <h6 className="mb-3">Expenses by Category — Last {months} months</h6>
            <CategoryBars rows={report.byCategory} total={report.categoryTotal} />
          </div>
        </div>
      </div>
    </div>
  );
}
