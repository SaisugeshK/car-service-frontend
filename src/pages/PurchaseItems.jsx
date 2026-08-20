import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import purchaseItemsService from '../services/purchaseItemsService';
import purchasesService from '../services/purchasesService';
import productsService from '../services/productsService';
import { purchaseItemSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

export default function PurchaseItems() {
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    Promise.all([purchasesService.getAll(), productsService.getAll({ itemType: 'PRODUCT' })]).then(
      ([purchases, products]) => {
        setRefs({
          purchases: Array.isArray(purchases) ? purchases : purchases?.content || [],
          products: Array.isArray(products) ? products : products?.content || [],
        });
      }
    );
  }, []);

  if (!refs) return <Loader label="Loading references..." />;
  const { purchases, products } = refs;

  const config = {
    title: 'Purchase Items',
    entityName: 'Purchase Item',
    service: purchaseItemsService,
    searchKeys: [],
    defaultValues: { purchaseId: '', productId: '', quantity: '', purchasePrice: '', taxAmount: '' },
    schema: purchaseItemSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      {
        key: 'purchaseId',
        label: 'Purchase',
        render: (row) => purchases.find((p) => p.id === row.purchaseId)?.invoiceNumber || row.purchaseId,
      },
      {
        key: 'productId',
        label: 'Product',
        render: (row) => products.find((p) => p.id === row.productId)?.productName || row.productId,
      },
      { key: 'quantity', label: 'Qty', sortable: true },
      { key: 'purchasePrice', label: 'Purchase Price' },
      { key: 'taxAmount', label: 'Tax' },
    ],
    fields: [
      {
        name: 'purchaseId',
        label: 'Purchase',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'invoiceNumber',
        options: purchases,
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
      { name: 'purchasePrice', label: 'Purchase Price', type: 'number', step: '0.01', required: true },
      { name: 'taxAmount', label: 'Tax Amount', type: 'number', step: '0.01', required: true },
    ],
  };

  return <CrudPage config={config} />;
}
