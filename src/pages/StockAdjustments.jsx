import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus } from 'react-icons/fi';
import productsService from '../services/productsService';
import stockMovementsService from '../services/stockMovementsService';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

// A deliberate, logged IN/OUT correction — not free-form stock editing. Every other stock
// change (Purchase, Invoice, Returns) happens automatically elsewhere.
export default function StockAdjustments() {
  // Read-only for an EMPLOYEE — the API refuses their writes anyway; this hides the buttons.
  const { isSuperAdmin } = useAuth();
  const [products, setProducts] = useState(null);
  const [movements, setMovements] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [productId, setProductId] = useState('');
  const [direction, setDirection] = useState('ADJUSTMENT_IN');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadMovements = () =>
    stockMovementsService
      .getAll()
      .then((data) => {
        const list = asList(data).filter((m) => (m.movementType || '').startsWith('ADJUSTMENT'));
        setMovements(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      })
      .catch(() => setLoadError(true));

  const load = () => {
    setLoadError(false);
    productsService.getAll({ itemType: 'PRODUCT' }).then((data) => setProducts(asList(data))).catch(() => setLoadError(true));
    loadMovements();
  };

  useEffect(load, []);

  const openCreate = () => {
    setProductId('');
    setDirection('ADJUSTMENT_IN');
    setQuantity('');
    setNotes('');
    setShowForm(true);
  };

  const save = async () => {
    if (!productId) return toast.error('Please select a product');
    if (!quantity || Number(quantity) <= 0) return toast.error('Enter a quantity greater than zero');
    setSaving(true);
    try {
      await stockMovementsService.create({
        productId: Number(productId),
        movementType: direction,
        quantity: Number(quantity),
        notes,
      });
      toast.success('Stock adjusted');
      setShowForm(false);
      productsService.getAll({ itemType: 'PRODUCT' }).then((data) => setProducts(asList(data)));
      loadMovements();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <ErrorPage message="Could not load stock adjustments. Check your connection and try again." onRetry={load} />;
  if (!products || !movements) return <Loader label="Loading stock adjustments..." />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Stock Adjustments</h1>
        {isSuperAdmin && (
          <button className="btn btn-primary d-flex align-items-center gap-1" onClick={openCreate}>
            <FiPlus /> New Adjustment
          </button>
        )}
      </div>

      <DataTable
        rows={movements}
        keyField="movementId"
        emptyTitle="No adjustments yet"
        emptyMessage="Use this only for corrections — purchases, sales and returns adjust stock automatically."
        columns={[
          { key: 'createdAt', label: 'Date', render: (row) => new Date(row.createdAt).toLocaleString() },
          { key: 'productName', label: 'Product' },
          {
            key: 'movementType',
            label: 'Direction',
            render: (row) => (
              <span className={`badge ${row.movementType === 'ADJUSTMENT_IN' ? 'bg-success' : 'bg-danger'}`}>
                {row.movementType === 'ADJUSTMENT_IN' ? 'IN' : 'OUT'}
              </span>
            ),
          },
          { key: 'quantity', label: 'Qty' },
          { key: 'notes', label: 'Notes' },
        ]}
      />

      <Modal
        show={showForm}
        title="New Stock Adjustment"
        onClose={() => setShowForm(false)}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <div className="mb-3">
          <label className="form-label">Product *</label>
          <select className="form-select" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.productName} (stock: {p.stockQuantity})</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Direction *</label>
          <select className="form-select" value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="ADJUSTMENT_IN">Stock IN (found extra / correction)</option>
            <option value="ADJUSTMENT_OUT">Stock OUT (damaged / lost / correction)</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Quantity *</label>
          <input type="number" min="1" className="form-control" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Reason / Notes</label>
          <textarea className="form-control" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
