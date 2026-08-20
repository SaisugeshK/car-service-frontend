import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import purchaseReturnItemsService from '../services/purchaseReturnItemsService';
import purchaseReturnsService from '../services/purchaseReturnsService';
import productsService from '../services/productsService';
import { purchaseReturnItemSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

export default function PurchaseReturnItems() {
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    Promise.all([purchaseReturnsService.getAll(), productsService.getAll({ itemType: 'PRODUCT' })]).then(
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
    title: 'Purchase Return Items',
    entityName: 'Purchase Return Item',
    service: purchaseReturnItemsService,
    searchKeys: [],
    defaultValues: { purchaseReturnId: '', productId: '', quantity: '', price: '' },
    schema: purchaseReturnItemSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'purchaseReturnId', label: 'Return ID' },
      {
        key: 'productId',
        label: 'Product',
        render: (row) => products.find((p) => p.id === row.productId)?.productName || row.productId,
      },
      { key: 'quantity', label: 'Qty' },
      { key: 'price', label: 'Price' },
    ],
    fields: [
      {
        name: 'purchaseReturnId',
        label: 'Purchase Return',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'id',
        options: returns,
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
      { name: 'price', label: 'Price', type: 'number', step: '0.01', required: true },
    ],
  };

  return <CrudPage config={config} />;
}
