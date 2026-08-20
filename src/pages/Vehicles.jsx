import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import vehiclesService from '../services/vehiclesService';
import customersService from '../services/customersService';
import { vehicleSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

export default function Vehicles() {
  const [customers, setCustomers] = useState(null);

  useEffect(() => {
    customersService.getAll().then((data) => {
      setCustomers(Array.isArray(data) ? data : data?.content || []);
    });
  }, []);

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
        key: 'odometer',
        label: 'Odometer',
        render: (row) => (row.odometer != null ? `${row.odometer} km` : '—'),
      },
      { key: 'vehicleType', label: 'Type' },
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
      { name: 'variant', label: 'Variant', placeholder: 'e.g. SX(O)' },
      { name: 'registrationNumber', label: 'Registration No.', required: true, placeholder: 'e.g. TN 09 AB 4521' },
      { name: 'odometer', label: 'Current Odometer (km)', type: 'number' },
      {
        name: 'vehicleType',
        label: 'Vehicle Type',
        type: 'select',
        options: [
          { value: 'Hatchback', label: 'Hatchback' },
          { value: 'Sedan', label: 'Sedan' },
          { value: 'SUV', label: 'SUV' },
          { value: 'Van', label: 'Van' },
          { value: 'Other', label: 'Other' },
        ],
      },
      {
        name: 'fuelType',
        label: 'Fuel Type',
        type: 'select',
        options: [
          { value: 'Petrol', label: 'Petrol' },
          { value: 'Diesel', label: 'Diesel' },
          { value: 'CNG', label: 'CNG' },
          { value: 'Electric', label: 'Electric' },
          { value: 'Hybrid', label: 'Hybrid' },
        ],
      },
      { name: 'color', label: 'Color' },
      { name: 'year', label: 'Year', type: 'number' },
      { name: 'chassisNumber', label: 'VIN / Chassis Number' },
      { name: 'engineNumber', label: 'Engine Number' },
      { name: 'notes', label: 'Notes', fullWidth: true },
    ],
  };

  return <CrudPage config={config} />;
}
