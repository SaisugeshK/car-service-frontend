import CrudPage from './CrudPage';
import rolesService from '../services/rolesService';
import { roleSchema } from '../utils/validationSchemas';

const config = {
  title: 'Roles',
  entityName: 'Role',
  service: rolesService,
  searchKeys: ['roleName'],
  defaultValues: { roleName: '', description: '' },
  schema: roleSchema,
  columns: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'roleName', label: 'Role Name', sortable: true },
    { key: 'description', label: 'Description' },
  ],
  fields: [
    { name: 'roleName', label: 'Role Name', required: true },
    { name: 'description', label: 'Description' },
  ],
};

export default function Roles() {
  return <CrudPage config={config} />;
}
