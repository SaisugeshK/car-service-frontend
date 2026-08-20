import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import stockMovementsService from '../services/stockMovementsService';
import productsService from '../services/productsService';
import { stockMovementSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

export default function StockMovements() {
  const [products, setProducts] = useState(null);

  useEffect(() => {
    productsService.getAll({ itemType: 'PRODUCT' }).then((data) => {
      const list = Array.isArray(data) ? data : data?.content || [];
      setProducts(list);
    });
  }, []);

  if (!products) return <Loader label="Loading products..." />;

  const config = {
    title: 'Stock Movements',
    entityName: 'Stock Movement',
    service: stockMovementsService,
    searchKeys: ['remarks'],
    defaultValues: { productId: '', movementType: 'IN', quantity: '', remarks: '' },
    schema: stockMovementSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      {
        key: 'productId',
        label: 'Product',
        render: (row) => products.find((p) => p.id === row.productId)?.productName || row.productId,
      },
      {
        key: 'movementType',
        label: 'Type',
        render: (row) => (
          <span className={`badge ${row.movementType === 'IN' ? 'bg-success' : 'bg-danger'}`}>
            {row.movementType}
          </span>
        ),
      },
      { key: 'quantity', label: 'Quantity', sortable: true },
      { key: 'remarks', label: 'Remarks' },
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
      {
        name: 'movementType',
        label: 'Movement Type',
        type: 'select',
        required: true,
        options: [
          { value: 'IN', label: 'Stock In' },
          { value: 'OUT', label: 'Stock Out' },
        ],
      },
      { name: 'quantity', label: 'Quantity', type: 'number', required: true },
      { name: 'remarks', label: 'Remarks' },
    ],
  };

  return <CrudPage config={config} />;
}
