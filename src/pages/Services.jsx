import CrudPage from './CrudPage';
import serviceMasterService from '../services/serviceMasterService';
import { serviceMasterSchema } from '../utils/validationSchemas';
import { sizeClassesFor, vehicleSizeClassLabel } from '../utils/vehicleSizeClasses';
import { vehicleTypeSegments } from '../utils/vehicleTypeSegments';

// vehicleType here is CAR or BIKE — it decides which size bands get a price row.
const catFromServiceType = (vt) => (vt === 'BIKE' ? 'BIKE' : 'CAR');

const money = (v) => (v == null || v === '' ? null : `₹${Number(v).toFixed(0)}`);

const priceSummary = (row) => {
  const prices = row.sizePrices || [];
  if (prices.length === 0) {
    return <span className="small text-secondary">base {money(row.defaultPrice) ?? '—'}</span>;
  }
  return (
    <span className="small">
      {prices.map((sp) => (
        <span key={sp.sizeClassCode} className="me-2 text-nowrap">
          {vehicleSizeClassLabel(sp.sizeClassCode)} {money(sp.price)}
        </span>
      ))}
    </span>
  );
};

const config = {
  title: 'Service Master',
  entityName: 'Service',
  service: serviceMasterService,
  searchKeys: ['serviceName', 'serviceCode'],
  defaultValues: {
    serviceCode: '',
    serviceName: '',
    description: '',
    vehicleType: 'CAR',
    defaultPrice: '',
    gstPercentage: '18',
    durationMinutes: '',
    status: 'active',
    sizePrices: {},
  },
  schema: serviceMasterSchema,
  segments: vehicleTypeSegments,
  // Fold the priceGrid object { SUV: '3000', ... } into the API's list shape, and back.
  transformPayload: (payload) => {
    const obj = payload.sizePrices || {};
    return {
      ...payload,
      sizePrices: Object.entries(obj)
        .filter(([, v]) => v !== '' && v != null)
        .map(([sizeClassCode, price]) => ({ sizeClassCode, price: Number(price) })),
    };
  },
  transformRow: (row) => ({
    ...row,
    sizePrices: Object.fromEntries((row.sizePrices || []).map((sp) => [sp.sizeClassCode, sp.price])),
  }),
  columns: [
    { key: 'serviceId', label: 'ID', sortable: true },
    { key: 'serviceCode', label: 'Code' },
    { key: 'serviceName', label: 'Service', sortable: true },
    {
      key: 'vehicleType',
      label: 'For',
      render: (row) => (
        <span className="badge bg-secondary">{row.vehicleType === 'BIKE' ? 'Bike' : 'Car'}</span>
      ),
    },
    { key: 'sizePrices', label: 'Price per size', render: priceSummary },
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
    {
      name: 'vehicleType',
      label: 'Vehicle Type',
      type: 'select',
      required: true,
      options: [
        { value: 'CAR', label: 'Car' },
        { value: 'BIKE', label: 'Bike' },
      ],
    },
    { name: 'defaultPrice', label: 'Base / fallback price', type: 'number', step: '0.01', required: true },
    { name: 'gstPercentage', label: 'GST %', type: 'number', step: '0.01', required: true },
    { name: 'durationMinutes', label: 'Duration (minutes)', type: 'number', placeholder: 'Optional, e.g. 60' },
    {
      name: 'sizePrices',
      label: 'Price per size',
      type: 'priceGrid',
      fullWidth: true,
      help: 'Leave a box blank to use the base price for that size.',
      options: (v) => sizeClassesFor(catFromServiceType(v.vehicleType)),
    },
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

export default function Services() {
  return <CrudPage config={config} />;
}
