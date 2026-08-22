import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import salesService from '../services/salesService';
import customersService from '../services/customersService';
import { saleSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

export default function Sales() {
  const [customers, setCustomers] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoadError(false);
    customersService
      .getAll()
      .then((data) => setCustomers(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setLoadError(true));
  };

  useEffect(load, []);

  if (loadError) return <ErrorPage message="Could not load customers. Check your connection and try again." onRetry={load} />;
  if (!customers) return <Loader label="Loading customers..." />;

  const config = {
    title: 'Sales',
    entityName: 'Sale',
    service: salesService,
    searchKeys: ['invoiceNumber', 'paymentStatus'],
    defaultValues: {
      customerId: '',
      invoiceNumber: '',
      totalAmount: '',
      paymentStatus: 'PAID',
    },
    schema: saleSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      {
        key: 'customerId',
        label: 'Customer',
        render: (row) => customers.find((c) => c.id === row.customerId)?.customerName || row.customerId,
      },
      { key: 'invoiceNumber', label: 'Invoice #' },
      { key: 'totalAmount', label: 'Total', sortable: true },
      { key: 'paymentStatus', label: 'Payment Status' },
    ],
    fields: [
      {
        name: 'customerId',
        label: 'Customer',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'customerName',
        options: customers,
      },
      { name: 'invoiceNumber', label: 'Invoice Number' },
      { name: 'totalAmount', label: 'Total Amount', type: 'number', step: '0.01' },
      {
        name: 'paymentStatus',
        label: 'Payment Status',
        type: 'select',
        options: [
          { value: 'PAID', label: 'Paid' },
          { value: 'PENDING', label: 'Pending' },
          { value: 'UNPAID', label: 'Unpaid' },
        ],
      },
    ],
  };

  return <CrudPage config={config} />;
}
