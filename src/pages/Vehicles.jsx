import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import vehiclesService from '../services/vehiclesService';
import customersService from '../services/customersService';
import { vehicleSchema } from '../utils/validationSchemas';
import { sizeClassesFor, vehicleSizeClassLabel } from '../utils/vehicleSizeClasses';
import { bodyTypeOptions, fuelTypeOptions } from '../utils/vehicleOptions';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

export default function Vehicles() {
  const [customers, setCustomers] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoadError(false);
    customersService
      .getAll()
      .then((data) => setCustomers(Array.isArray(data) ? data : data?.content || []))
      .catch(() => setLoadError(true));
  };

  useEffect(load, []);

  if (loadError) return <ErrorPage message="Could not load customers. Check your connection and try again." onRetry={load} />;
  if (!customers) return <Loader label="Loading customers..." />;

  const config = {
    title: 'Vehicles',
    entityName: 'Vehicle',
    service: vehiclesService,
    searchKeys: ['vehicleModel', 'make', 'registrationNumber'],
    defaultValues: {
      customerId: '',
      make: '',
      vehicleModel: '',
      variant: '',
      registrationNumber: '',
      odometer: '',
      vehicleType: '',
      fuelType: '',
      color: '',
      year: '',
      chassisNumber: '',
      engineNumber: '',
      vehicleCategory: '',
      sizeClass: '',
      insuranceCompany: '',
      insuranceExpiry: '',
      pucExpiry: '',
      notes: '',
    },
    schema: vehicleSchema,
    columns: [
      { key: 'vehicleId', label: 'ID', sortable: true },
      {
        key: 'customerId',
        label: 'Customer',
        render: (row) => customers.find((c) => c.id === row.customerId)?.customerName || row.customerId,
      },
      {
        key: 'vehicleModel',
        label: 'Vehicle',
        sortable: true,
        render: (row) => [row.make, row.vehicleModel].filter(Boolean).join(' '),
      },
      { key: 'registrationNumber', label: 'Registration No.' },
      {
        key: 'vehicleCategory',
        label: 'Category',
        render: (row) =>
          row.vehicleCategory ? (
            <span className={`badge ${row.vehicleCategory === 'BIKE' ? 'bg-info' : 'bg-primary'}`}>{row.vehicleCategory}</span>
          ) : '—',
      },
      {
        key: 'odometer',
        label: 'Odometer',
        render: (row) => (row.odometer != null ? `${row.odometer} km` : '—'),
      },
      { key: 'vehicleType', label: 'Type' },
      {
        key: 'sizeClass',
        label: 'Size',
        render: (row) => (row.sizeClass ? vehicleSizeClassLabel(row.sizeClass) : '—'),
      },
      { key: 'fuelType', label: 'Fuel' },
    ],
    fields: [
      {
        name: 'customerId',
        label: 'Customer',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'customerName',
        options: customers,
      },
      { name: 'make', label: 'Make', placeholder: 'e.g. Hyundai' },
      { name: 'vehicleModel', label: 'Model', required: true, placeholder: 'e.g. Creta' },
      {
        name: 'vehicleCategory',
        label: 'Category (Car / Bike)',
        type: 'select',
        required: true,
        options: [
          { value: 'CAR', label: 'Car' },
          { value: 'BIKE', label: 'Bike' },
        ],
      },
      { name: 'variant', label: 'Variant', placeholder: 'e.g. SX(O)' },
      { name: 'registrationNumber', label: 'Registration No.', required: true, placeholder: 'e.g. TN 09 AB 4521' },
      { name: 'odometer', label: 'Current Odometer (km)', type: 'number' },
      {
        name: 'vehicleType',
        label: 'Vehicle Type',
        type: 'select',
        showIf: (v) => !!v.vehicleCategory,
        options: (v) => bodyTypeOptions(v.vehicleCategory),
      },
      {
        name: 'sizeClass',
        label: 'Size (affects service pricing)',
        type: 'select',
        showIf: (v) => !!v.vehicleCategory,
        options: (v) => sizeClassesFor(v.vehicleCategory),
      },
      {
        name: 'fuelType',
        label: 'Fuel Type',
        type: 'select',
        showIf: (v) => !!v.vehicleCategory,
        options: (v) => fuelTypeOptions(v.vehicleCategory),
      },
      { name: 'color', label: 'Color' },
      { name: 'year', label: 'Year', type: 'number' },
      { name: 'chassisNumber', label: 'VIN / Chassis Number' },
      { name: 'engineNumber', label: 'Engine Number' },
      { name: 'insuranceCompany', label: 'Insurance Company' },
      { name: 'insuranceExpiry', label: 'Insurance Expiry', type: 'date' },
      { name: 'pucExpiry', label: 'PUC Expiry', type: 'date' },
      { name: 'notes', label: 'Notes', fullWidth: true },
    ],
  };

  return <CrudPage config={config} />;
}
