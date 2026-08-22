import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import productTaxesService from '../services/productTaxesService';
import productsService from '../services/productsService';
import { productTaxSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

export default function ProductTaxes() {
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
    title: 'Product Taxes',
    entityName: 'Product Tax',
    service: productTaxesService,
    searchKeys: ['taxName'],
    defaultValues: { productId: '', taxName: 'GST', taxPercentage: '' },
    schema: productTaxSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      {
        key: 'productId',
        label: 'Product',
        render: (row) => products.find((p) => p.id === row.productId)?.productName || row.productId,
      },
      { key: 'taxName', label: 'Tax Name' },
      { key: 'taxPercentage', label: 'Percentage', render: (row) => `${row.taxPercentage}%` },
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
      { name: 'taxName', label: 'Tax Name', required: true },
      { name: 'taxPercentage', label: 'Tax Percentage', type: 'number', step: '0.01', required: true },
    ],
  };

  return <CrudPage config={config} />;
}
