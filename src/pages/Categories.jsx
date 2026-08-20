import CrudPage from './CrudPage';
import categoriesService from '../services/categoriesService';
import { categorySchema } from '../utils/validationSchemas';

const config = {
  title: 'Categories',
  entityName: 'Category',
  service: categoriesService,
  searchKeys: ['categoryName'],
  defaultValues: { categoryName: '', description: '', status: 'ACTIVE' },
  schema: categorySchema,
  columns: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'categoryName', label: 'Category', sortable: true },
    { key: 'description', label: 'Description' },
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
    { name: 'categoryName', label: 'Category Name', required: true },
    { name: 'description', label: 'Description' },
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

export default function Categories() {
  return <CrudPage config={config} />;
}
