import { useEffect, useState } from 'react';
import { FiFileText, FiShoppingCart, FiRotateCcw, FiActivity } from 'react-icons/fi';
import invoicesService from '../services/invoicesService';
import purchasesService from '../services/purchasesService';
import salesReturnsService from '../services/salesReturnsService';
import stockMovementsService from '../services/stockMovementsService';
import productsService from '../services/productsService';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';
import EmptyState from '../components/EmptyState';

const asList = (data) => (Array.isArray(data) ? data : data?.content || data?.data || []);

const TABS = [
  { key: 'sales', label: 'Sales (Invoices)', icon: FiFileText },
  { key: 'purchases', label: 'Purchases', icon: FiShoppingCart },
  { key: 'returns', label: 'Sales Returns', icon: FiRotateCcw },
  { key: 'stock', label: 'Stock Movements', icon: FiActivity },
];

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const [state, setState] = useState({ loading: true, error: null, data: {} });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      invoicesService.getAll(),
      purchasesService.getAll(),
      salesReturnsService.getAll(),
      stockMovementsService.getAll(),
      productsService.getAll(),
    ])
      .then(([invoices, purchases, returns, stock, products]) => {
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          data: {
            sales: asList(invoices),
            purchases: asList(purchases),
            returns: asList(returns),
            stock: asList(stock),
            products: asList(products),
          },
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, loading: false, error }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) return <Loader label="Building reports..." />;
  if (state.error) return <ErrorPage message="Could not load report data from the backend." />;

  const { sales, purchases, returns, stock, products } = state.data;
  const productName = (id) => products.find((p) => p.id === id)?.productName || id;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Reports</h1>
      </div>

      <ul className="nav nav-tabs mb-3">
        {TABS.map((t) => (
          <li className="nav-item" key={t.key}>
            <button
              className={`nav-link d-flex align-items-center gap-1 ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={14} /> {t.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="erp-card p-3">
        {tab === 'sales' &&
          (sales.length === 0 ? (
            <EmptyState title="No invoices yet" message="Sales report will populate once invoices are created." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Subtotal</th>
                    <th>Tax</th>
                    <th>Discount</th>
                    <th>Grand Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.invoiceNumber}</td>
                      <td>{Number(inv.subtotal || 0).toFixed(2)}</td>
                      <td>{Number(inv.taxAmount || 0).toFixed(2)}</td>
                      <td>{Number(inv.discountAmount || 0).toFixed(2)}</td>
                      <td>{Number(inv.grandTotal || 0).toFixed(2)}</td>
                      <td>{inv.paymentStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {tab === 'purchases' &&
          (purchases.length === 0 ? (
            <EmptyState title="No purchases yet" message="Purchase report will populate once purchases are recorded." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Total</th>
                    <th>Tax</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id}>
                      <td>{p.invoiceNumber}</td>
                      <td>{Number(p.totalAmount || 0).toFixed(2)}</td>
                      <td>{Number(p.tax || 0).toFixed(2)}</td>
                      <td>{p.paymentStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {tab === 'returns' &&
          (returns.length === 0 ? (
            <EmptyState title="No sales returns yet" message="Returns will show up here once recorded." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Sale ID</th>
                    <th>Qty Returned</th>
                    <th>Reason</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((r) => (
                    <tr key={r.id}>
                      <td>{r.saleId}</td>
                      <td>{r.returnQuantity}</td>
                      <td>{r.reason}</td>
                      <td>{Number(r.totalAmount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {tab === 'stock' &&
          (stock.length === 0 ? (
            <EmptyState title="No stock movements yet" message="Stock changes from sales and purchases will appear here." />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((s) => (
                    <tr key={s.id}>
                      <td>{productName(s.productId)}</td>
                      <td>
                        <span className={`badge ${s.movementType === 'IN' ? 'bg-success' : 'bg-danger'}`}>
                          {s.movementType}
                        </span>
                      </td>
                      <td>{s.quantity}</td>
                      <td>{s.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </div>
  );
}
