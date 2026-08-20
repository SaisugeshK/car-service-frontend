import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import salesReturnsService from '../services/salesReturnsService';
import salesService from '../services/salesService';
import customersService from '../services/customersService';
import { salesReturnSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

export default function SalesReturns() {
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    Promise.all([salesService.getAll(), customersService.getAll()]).then(([sales, customers]) => {
      setRefs({
        sales: Array.isArray(sales) ? sales : sales?.content || [],
        customers: Array.isArray(customers) ? customers : customers?.content || [],
      });
    });
  }, []);

  if (!refs) return <Loader label="Loading references..." />;
  const { sales, customers } = refs;

  const config = {
    title: 'Sales Returns',
    entityName: 'Sales Return',
    service: salesReturnsService,
    searchKeys: ['reason'],
    defaultValues: {
      salesItemId: '',
      saleId: '',
      customerId: '',
      returnQuantity: '',
      reason: '',
      totalAmount: '',
      notes: '',
    },
    schema: salesReturnSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'saleId', label: 'Sale ID' },
      {
        key: 'customerId',
        label: 'Customer',
        render: (row) => customers.find((c) => c.id === row.customerId)?.customerName || row.customerId,
      },
      { key: 'returnQuantity', label: 'Qty' },
      { key: 'reason', label: 'Reason' },
      { key: 'totalAmount', label: 'Total' },
    ],
    fields: [
      { name: 'salesItemId', label: 'Sales Item ID', type: 'number', required: true },
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
        name: 'customerId',
        label: 'Customer',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'customerName',
        options: customers,
      },
      { name: 'returnQuantity', label: 'Return Quantity', type: 'number', required: true },
      { name: 'reason', label: 'Reason', required: true },
      { name: 'totalAmount', label: 'Total Amount', type: 'number', step: '0.01', required: true },
      { name: 'notes', label: 'Notes' },
    ],
  };

  return <CrudPage config={config} />;
}
