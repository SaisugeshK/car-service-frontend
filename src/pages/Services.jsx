import CrudPage from './CrudPage';
import serviceMasterService from '../services/serviceMasterService';
import { serviceMasterSchema } from '../utils/validationSchemas';

export default function Services() {
  const config = {
    title: 'Service Master',
    entityName: 'Service',
    service: serviceMasterService,
    searchKeys: ['serviceName', 'serviceCode'],
    defaultValues: {
      serviceCode: '',
      serviceName: '',
      description: '',
      defaultPrice: '',
      gstPercentage: '18',
      durationMinutes: '',
      status: 'active',
    },
    schema: serviceMasterSchema,
    columns: [
      { key: 'serviceId', label: 'ID', sortable: true },
      { key: 'serviceCode', label: 'Code' },
      { key: 'serviceName', label: 'Service', sortable: true },
      {
        key: 'defaultPrice',
        label: 'Price',
        sortable: true,
        render: (row) => Number(row.defaultPrice ?? 0).toFixed(2),
      },
      { key: 'gstPercentage', label: 'GST %' },
      {
        key: 'status',
        label: 'Status',
        render: (row) => (
          <span className={`badge ${String(row.status).toLowerCase() === 'active' ? 'bg-success' : 'bg-secondary'}`}>
            {row.status}
          </span>
        ),
      },
    ],
    fields: [
      { name: 'serviceCode', label: 'Service Code', placeholder: 'e.g. SRV-001' },
      { name: 'serviceName', label: 'Service Name', required: true, fullWidth: true },
      { name: 'description', label: 'Description', fullWidth: true },
      { name: 'defaultPrice', label: 'Default Price', type: 'number', step: '0.01', required: true },
      { name: 'gstPercentage', label: 'GST %', type: 'number', step: '0.01', required: true },
      { name: 'durationMinutes', label: 'Duration (minutes)', type: 'number', placeholder: 'Optional, e.g. 60' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      },
    ],
  };

  return <CrudPage config={config} />;
}
