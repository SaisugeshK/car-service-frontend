import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import salesItemsService from '../services/salesItemsService';
import salesService from '../services/salesService';
import productsService from '../services/productsService';
import * as yup from 'yup';
import Loader from '../components/Loader';

const schema = yup.object({
  saleId: yup.number().typeError('Sale is required').required('Sale is required'),
  productId: yup.number().typeError('Product is required').required('Product is required'),
  quantity: yup.number().typeError('Enter a valid quantity').positive('Must be positive').required('Required'),
});

export default function SalesItems() {
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    Promise.all([salesService.getAll(), productsService.getAll()]).then(([sales, products]) => {
      setRefs({
        sales: Array.isArray(sales) ? sales : sales?.content || [],
        products: Array.isArray(products) ? products : products?.content || [],
      });
    });
  }, []);

  if (!refs) return <Loader label="Loading references..." />;
  const { sales, products } = refs;

  const config = {
    title: 'Sales Items',
    entityName: 'Sales Item',
    service: salesItemsService,
    searchKeys: [],
    defaultValues: { saleId: '', productId: '', quantity: '' },
    schema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'saleId', label: 'Sale ID' },
      {
        key: 'productId',
        label: 'Product',
        render: (row) => products.find((p) => p.id === row.productId)?.productName || row.productId,
      },
      { key: 'quantity', label: 'Quantity' },
    ],
    fields: [
      {
        name: 'saleId',
        label: 'Sale',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'id',
        options: sales,
      },
      {
        name: 'productId',
        label: 'Product',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'productName',
        options: products,
      },
      { name: 'quantity', label: 'Quantity', type: 'number', required: true },
    ],
  };

  return <CrudPage config={config} />;
}
