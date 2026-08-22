import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { FiClock } from 'react-icons/fi';
import productsService from '../services/productsService';
import categoriesService from '../services/categoriesService';
import stockMovementsService from '../services/stockMovementsService';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import ErrorPage from './ErrorPage';

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

// Every movement type this table can show, and how to badge it. Purchases/Sales/Returns write
// these automatically now (Phase 22); Stock Adjustments already did.
const MOVEMENT_LABEL = {
  SALE_OUT: { label: 'Sale', tone: 'bg-danger', sign: -1 },
  SALE_CANCEL_IN: { label: 'Invoice Cancelled', tone: 'bg-success', sign: 1 },
  PURCHASE_IN: { label: 'Purchase', tone: 'bg-success', sign: 1 },
  RETURN_IN: { label: 'Customer Return', tone: 'bg-success', sign: 1 },
  RETURN_REVERSE_OUT: { label: 'Return Reversed', tone: 'bg-danger', sign: -1 },
  ADJUSTMENT_IN: { label: 'Adjustment (In)', tone: 'bg-success', sign: 1 },
  ADJUSTMENT_OUT: { label: 'Adjustment (Out)', tone: 'bg-danger', sign: -1 },
};

// Read-only — stock only ever changes via Purchase, Invoice completion, Returns, or a
// deliberate Stock Adjustment; there is no free-form manual entry here anymore.
export default function InventoryStock() {
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState(null); // { product, movements } | null
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoadError(false);
    Promise.all([productsService.getAll({ itemType: 'PRODUCT' }), categoriesService.getAll()])
      .then(([p, c]) => {
        setProducts(asList(p));
        setCategories(asList(c));
      })
      .catch(() => setLoadError(true));
  };

  useEffect(load, []);

  const openHistory = (product) => {
    setHistory({ product, movements: null });
    setLoadingHistory(true);
    stockMovementsService
      .getByProductId(product.productId)
      .then((data) => setHistory({ product, movements: asList(data).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) }))
      .catch(() => setHistory({ product, movements: null, error: true }))
      .finally(() => setLoadingHistory(false));
  };

  if (loadError) return <ErrorPage message="Could not load stock. Check your connection and try again." onRetry={load} />;
  if (!products) return <Loader label="Loading stock..." />;

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.productName?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Stock</h1>
        <div className="d-flex align-items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search products..." />
          <button className="btn btn-outline-primary" onClick={() => navigate('/stock-adjustments')}>
            Adjust Stock
          </button>
        </div>
      </div>
      <DataTable
        rows={filtered}
        keyField="productId"
        emptyTitle="No products yet"
        emptyMessage="Add products in Catalog to see stock here."
        columns={[
          { key: 'productName', label: 'Product', sortable: true },
          { key: 'sku', label: 'SKU' },
          {
            key: 'categoryId',
            label: 'Category',
            render: (row) => categories.find((c) => c.id === row.categoryId)?.categoryName || '—',
          },
          { key: 'unit', label: 'Unit' },
          { key: 'purchasePrice', label: 'Purchase Price', render: (row) => Number(row.purchasePrice ?? 0).toFixed(2) },
          { key: 'sellingPrice', label: 'Selling Price', render: (row) => Number(row.sellingPrice ?? 0).toFixed(2) },
          {
            key: 'stockQuantity',
            label: 'Stock',
            sortable: true,
            render: (row) => {
              const stock = Number(row.stockQuantity);
              const min = Number(row.minimumStock);
              const tone = stock <= 0 ? 'bg-danger' : stock <= min ? 'bg-warning text-dark' : 'bg-success';
              const label = stock <= 0 ? 'Out of Stock' : stock <= min ? 'Low Stock' : 'Available';
              return (
                <span className={`badge ${tone}`}>
                  {row.stockQuantity} · {label}
                </span>
              );
            },
          },
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                onClick={(e) => { e.stopPropagation(); openHistory(row); }}
              >
                <FiClock size={13} /> History
              </button>
            ),
          },
        ]}
      />

      <Modal
        show={Boolean(history)}
        title={history ? `Movement History — ${history.product.productName}` : ''}
        onClose={() => setHistory(null)}
        footer={<button className="btn btn-secondary" onClick={() => setHistory(null)}>Close</button>}
      >
        {loadingHistory && <Loader label="Loading movements..." />}
        {!loadingHistory && history?.error && (
          <p className="text-danger small mb-0">Could not load movement history. Please try again.</p>
        )}
        {!loadingHistory && !history?.error && history?.movements?.length === 0 && (
          <p className="text-secondary small mb-0">No stock movements recorded for this product yet.</p>
        )}
        {!loadingHistory && history?.movements?.length > 0 && (
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Notes</th></tr></thead>
              <tbody>
                {history.movements.map((m) => {
                  const meta = MOVEMENT_LABEL[m.movementType] || { label: m.movementType, tone: 'bg-secondary', sign: 1 };
                  return (
                    <tr key={m.movementId}>
                      <td className="text-nowrap">{dayjs(m.createdAt).format('DD MMM YYYY, hh:mm A')}</td>
                      <td><span className={`badge ${meta.tone}`}>{meta.label}</span></td>
                      <td>{meta.sign > 0 ? '+' : '−'}{m.quantity}</td>
                      <td className="small text-secondary">{m.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
