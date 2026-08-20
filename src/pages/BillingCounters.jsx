import CrudPage from './CrudPage';
import billingCountersService from '../services/billingCountersService';
import { billingCounterSchema } from '../utils/validationSchemas';

const config = {
  title: 'Billing Counters',
  entityName: 'Billing Counter',
  service: billingCountersService,
  searchKeys: ['counterName', 'location'],
  defaultValues: { counterName: '', location: '', status: 'ACTIVE' },
  schema: billingCounterSchema,
  columns: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'counterName', label: 'Counter Name', sortable: true },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' },
  ],
  fields: [
    { name: 'counterName', label: 'Counter Name', required: true },
    { name: 'location', label: 'Location', required: true },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
      ],
    },
  ],
};

export default function BillingCounters() {
  return <CrudPage config={config} />;
}
