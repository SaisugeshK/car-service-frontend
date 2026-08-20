import CrudPage from './CrudPage';
import cashClosingService from '../services/cashClosingService';
import { cashClosingSchema } from '../utils/validationSchemas';

const config = {
  title: 'Cash Closing',
  entityName: 'Cash Closing',
  service: cashClosingService,
  searchKeys: [],
  defaultValues: { counterId: '', openingCash: '', closingCash: '', totalSales: '' },
  schema: cashClosingSchema,
  columns: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'counterId', label: 'Counter ID', sortable: true },
    { key: 'openingCash', label: 'Opening Cash' },
    { key: 'closingCash', label: 'Closing Cash' },
    { key: 'totalSales', label: 'Total Sales' },
  ],
  fields: [
    { name: 'counterId', label: 'Counter ID', type: 'number', required: true },
    { name: 'openingCash', label: 'Opening Cash', type: 'number', step: '0.01', required: true },
    { name: 'closingCash', label: 'Closing Cash', type: 'number', step: '0.01', required: true },
    { name: 'totalSales', label: 'Total Sales', type: 'number', step: '0.01', required: true },
  ],
};

export default function CashClosing() {
  return <CrudPage config={config} />;
}
