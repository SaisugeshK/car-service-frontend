import CrudPage from './CrudPage';
import unitsService from '../services/unitsService';
import { unitSchema } from '../utils/validationSchemas';

const config = {
  title: 'Units',
  entityName: 'Unit',
  service: unitsService,
  searchKeys: ['unitName', 'shortName'],
  defaultValues: { unitName: '', shortName: '' },
  schema: unitSchema,
  columns: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'unitName', label: 'Unit Name', sortable: true },
    { key: 'shortName', label: 'Short Name' },
  ],
  fields: [
    { name: 'unitName', label: 'Unit Name', required: true },
    { name: 'shortName', label: 'Short Name', required: true },
  ],
};

export default function Units() {
  return <CrudPage config={config} />;
}
