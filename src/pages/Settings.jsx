import CrudPage from './CrudPage';
import settingsService from '../services/settingsService';
import { settingSchema } from '../utils/validationSchemas';

const config = {
  title: 'Settings',
  entityName: 'Setting',
  service: settingsService,
  searchKeys: ['settingKey', 'settingValue'],
  defaultValues: { settingKey: '', settingValue: '' },
  schema: settingSchema,
  columns: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'settingKey', label: 'Key', sortable: true },
    { key: 'settingValue', label: 'Value' },
  ],
  fields: [
    { name: 'settingKey', label: 'Setting Key', required: true },
    { name: 'settingValue', label: 'Setting Value', required: true },
  ],
};

export default function Settings() {
  return <CrudPage config={config} />;
}
