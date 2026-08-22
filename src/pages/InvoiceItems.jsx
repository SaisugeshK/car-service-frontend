import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import invoiceItemsService from '../services/invoiceItemsService';
import invoicesService from '../services/invoicesService';
import serviceMasterService from '../services/serviceMasterService';
import productsService from '../services/productsService';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

// Manual line-item corrections for an existing invoice — normal billing happens entirely
// through Point of Sale, which creates these rows automatically as part of "Complete Bill".
export default function InvoiceItems() {
  const [refs, setRefs] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoadError(false);
    Promise.all([invoicesService.getAll(), serviceMasterService.getAll(), productsService.getAll({ itemType: 'PRODUCT' })])
      .then(([invoices, services, products]) => {
        setRefs({
          invoices: Array.isArray(invoices) ? invoices : invoices?.content || [],
          services: Array.isArray(services) ? services : services?.content || [],
          products: Array.isArray(products) ? products : products?.content || [],
        });
      })
      .catch(() => setLoadError(true));
  };

  useEffect(load, []);

  if (loadError) return <ErrorPage message="Could not load references. Check your connection and try again." onRetry={load} />;
  if (!refs) return <Loader label="Loading references..." />;
  const { invoices, services, products } = refs;

  const config = {
    title: 'Invoice Items',
    entityName: 'Invoice Item',
    service: invoiceItemsService,
    searchKeys: [],
    defaultValues: {
      invoiceId: '',
      itemType: 'SERVICE',
      serviceId: '',
      productId: '',
      description: '',
      barcode: '',
      quantity: '',
      unitPrice: '',
      discount: '0',
      taxPercentage: '',
    },
    columns: [
      { key: 'invoiceItemId', label: 'ID', sortable: true },
      {
        key: 'invoiceId',
        label: 'Invoice',
        render: (row) => invoices.find((i) => i.id === row.invoiceId)?.invoiceNumber || row.invoiceId,
      },
      {
        key: 'itemType',
        label: 'Type',
        render: (row) => (
          <span className={`badge ${row.itemType === 'SERVICE' ? 'erp-badge-service' : 'erp-badge-product'}`}>
            {row.itemType === 'SERVICE' ? 'Service' : 'Product'}
          </span>
        ),
      },
      { key: 'itemName', label: 'Item' },
      { key: 'quantity', label: 'Qty' },
      { key: 'unitPrice', label: 'Rate' },
      { key: 'taxAmount', label: 'GST Amount' },
      { key: 'totalAmount', label: 'Total' },
    ],
    fields: [
      {
        name: 'invoiceId',
        label: 'Invoice',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'invoiceNumber',
        options: invoices,
      },
      {
        name: 'itemType',
        label: 'Item Type',
        type: 'select',
        required: true,
        options: [
          { value: 'SERVICE', label: 'Service' },
          { value: 'PRODUCT', label: 'Product' },
        ],
      },
      {
        name: 'serviceId',
        label: 'Service',
        type: 'select',
        valueKey: 'id',
        labelKey: 'serviceName',
        options: services,
        showIf: (values) => values.itemType === 'SERVICE',
      },
      {
        name: 'productId',
        label: 'Product',
        type: 'select',
        valueKey: 'id',
        labelKey: 'productName',
        options: products,
        showIf: (values) => values.itemType === 'PRODUCT',
      },
      {
        name: 'barcode',
        label: 'Barcode',
        showIf: (values) => values.itemType === 'PRODUCT',
      },
      { name: 'description', label: 'Description', fullWidth: true },
      { name: 'quantity', label: 'Quantity', type: 'number', step: '0.001', required: true },
      { name: 'unitPrice', label: 'Unit Price', type: 'number', step: '0.01', required: true },
      { name: 'discount', label: 'Discount', type: 'number', step: '0.01' },
      { name: 'taxPercentage', label: 'GST %', type: 'number', step: '0.01' },
    ],
  };

  return <CrudPage config={config} />;
}
