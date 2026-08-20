import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import salesReturnItemsService from '../services/salesReturnItemsService';
import salesReturnsService from '../services/salesReturnsService';
import productsService from '../services/productsService';
import { salesReturnItemSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

export default function SalesReturnItems() {
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    Promise.all([salesReturnsService.getAll(), productsService.getAll()]).then(
      ([returns, products]) => {
        setRefs({
          returns: Array.isArray(returns) ? returns : returns?.content || [],
          products: Array.isArray(products) ? products : products?.content || [],
        });
      }
    );
  }, []);

  if (!refs) return <Loader label="Loading references..." />;
  const { returns, products } = refs;

  const config = {
    title: 'Sales Return Items',
    entityName: 'Sales Return Item',
    service: salesReturnItemsService,
    searchKeys: [],
    defaultValues: { salesReturnId: '', saleId: '', productId: '', quantity: '' },
    schema: salesReturnItemSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'salesReturnId', label: 'Return ID' },
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
        name: 'salesReturnId',
        label: 'Sales Return',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'id',
        options: returns,
      },
      { name: 'saleId', label: 'Sale ID', type: 'number', required: true },
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
