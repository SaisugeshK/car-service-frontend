import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import productBarcodesService from '../services/productBarcodesService';
import productsService from '../services/productsService';
import { productBarcodeSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

export default function Barcodes() {
  const [products, setProducts] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoadError(false);
    productsService
      .getAll({ itemType: 'PRODUCT' })
      .then((data) => setProducts(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setLoadError(true));
  };

  useEffect(load, []);

  if (loadError) return <ErrorPage message="Could not load products. Check your connection and try again." onRetry={load} />;
  if (!products) return <Loader label="Loading products..." />;

  const config = {
    title: 'Product Barcodes',
    entityName: 'Barcode',
    service: productBarcodesService,
    searchKeys: ['barcode'],
    defaultValues: { productId: '', barcode: '' },
    schema: productBarcodeSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      {
        key: 'productId',
        label: 'Product',
        render: (row) => products.find((p) => p.id === row.productId)?.productName || row.productId,
      },
      { key: 'barcode', label: 'Barcode', sortable: true },
    ],
    fields: [
      {
        name: 'productId',
        label: 'Product',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'productName',
        options: products,
      },
      { name: 'barcode', label: 'Barcode', required: true },
    ],
  };

  return <CrudPage config={config} />;
}
