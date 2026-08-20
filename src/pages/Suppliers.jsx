import CrudPage from './CrudPage';
import suppliersService from '../services/suppliersService';
import { supplierSchema } from '../utils/validationSchemas';

const config = {
  title: 'Suppliers',
  entityName: 'Supplier',
  service: suppliersService,
  searchKeys: ['supplierName', 'contactPerson', 'phone', 'email'],
  defaultValues: {
    supplierName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    status: 'ACTIVE',
  },
  schema: supplierSchema,
  columns: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'supplierName', label: 'Supplier', sortable: true },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`badge ${row.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
          {row.status}
        </span>
      ),
    },
  ],
  fields: [
    { name: 'supplierName', label: 'Supplier Name', required: true },
    { name: 'contactPerson', label: 'Contact Person' },
    { name: 'phone', label: 'Phone', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'address', label: 'Address' },
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

export default function Suppliers() {
  return <CrudPage config={config} />;
}
