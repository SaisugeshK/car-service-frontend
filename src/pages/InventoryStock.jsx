import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import productsService from '../services/productsService';
import categoriesService from '../services/categoriesService';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import Loader from '../components/Loader';

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

// Read-only — stock only ever changes via Purchase, Invoice completion, Returns, or a
// deliberate Stock Adjustment; there is no free-form manual entry here anymore.
export default function InventoryStock() {
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([productsService.getAll({ itemType: 'PRODUCT' }), categoriesService.getAll()]).then(([p, c]) => {
      setProducts(asList(p));
      setCategories(asList(c));
    });
  }, []);

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
        ]}
      />
    </div>
  );
}
