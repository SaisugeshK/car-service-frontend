import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import purchaseReturnsService from '../services/purchaseReturnsService';
import purchasesService from '../services/purchasesService';
import suppliersService from '../services/suppliersService';
import { purchaseReturnSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

export default function PurchaseReturns() {
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    Promise.all([purchasesService.getAll(), suppliersService.getAll()]).then(
      ([purchases, suppliers]) => {
        setRefs({
          purchases: Array.isArray(purchases) ? purchases : purchases?.content || [],
          suppliers: Array.isArray(suppliers) ? suppliers : suppliers?.content || [],
        });
      }
    );
  }, []);

  if (!refs) return <Loader label="Loading references..." />;
  const { purchases, suppliers } = refs;

  const config = {
    title: 'Purchase Returns',
    entityName: 'Purchase Return',
    service: purchaseReturnsService,
    searchKeys: ['reason'],
    defaultValues: {
      purchaseId: '',
      supplierId: '',
      reason: '',
      totalAmount: '',
      status: 'RETURNED',
    },
    schema: purchaseReturnSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      {
        key: 'purchaseId',
        label: 'Purchase',
        render: (row) => purchases.find((p) => p.id === row.purchaseId)?.invoiceNumber || row.purchaseId,
      },
      {
        key: 'supplierId',
        label: 'Supplier',
        render: (row) => suppliers.find((s) => s.id === row.supplierId)?.supplierName || row.supplierId,
      },
      { key: 'reason', label: 'Reason' },
      { key: 'totalAmount', label: 'Total' },
      { key: 'status', label: 'Status' },
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
        name: 'supplierId',
        label: 'Supplier',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'supplierName',
        options: suppliers,
      },
      { name: 'reason', label: 'Reason', required: true },
      { name: 'totalAmount', label: 'Total Amount', type: 'number', step: '0.01', required: true },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'RETURNED', label: 'Returned' },
          { value: 'PENDING', label: 'Pending' },
        ],
      },
    ],
  };

  return <CrudPage config={config} />;
}
