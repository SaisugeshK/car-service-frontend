import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import productTaxesService from '../services/productTaxesService';
import productsService from '../services/productsService';
import { productTaxSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

export default function ProductTaxes() {
  const [products, setProducts] = useState(null);

  useEffect(() => {
    productsService.getAll({ itemType: 'PRODUCT' }).then((data) => {
      const list = Array.isArray(data) ? data : data?.content || [];
      setProducts(list);
    });
  }, []);

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
