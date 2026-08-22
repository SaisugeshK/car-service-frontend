import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { FiStar } from 'react-icons/fi';
import CrudPage from './CrudPage';
import reviewsService from '../services/reviewsService';
import customersService from '../services/customersService';
import vehiclesService from '../services/vehiclesService';
import jobCardsService from '../services/jobCardsService';
import { reviewSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);
const RATING_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: n, label: `${n} star${n > 1 ? 's' : ''}` }));

// Filled/outline stars for a compact at-a-glance rating — the same 1-5 scale used throughout
// the form, just rendered visually instead of as a number.
function Stars({ value }) {
  if (!value) return <span className="text-secondary">—</span>;
  return (
    <span className={value <= 2 ? 'text-danger' : 'text-warning'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <FiStar key={n} size={13} fill={n <= value ? 'currentColor' : 'none'} style={{ marginRight: 1 }} />
      ))}
    </span>
  );
}

export default function Reviews() {
  // A "Record Review" shortcut from a delivered job card (JobCardDetail) can pass along which
  // customer/vehicle/job card/invoice it's for, so the form opens pre-filled instead of asking
  // staff to look them up again.
  const location = useLocation();
  const prefill = location.state || {};
  const [customers, setCustomers] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [jobCards, setJobCards] = useState([]);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoadError(false);
    customersService.getAll().then((data) => setCustomers(asList(data))).catch(() => setLoadError(true));
    vehiclesService.getAll().then((data) => setVehicles(asList(data)));
    // Only delivered job cards are reviewable — matches how a review request is sent post-delivery.
    jobCardsService.getAll().then((data) => setJobCards(asList(data).filter((j) => j.status === 'DELIVERED')));
  };

  useEffect(load, []);

  if (loadError) return <ErrorPage message="Could not load reviews. Check your connection and try again." onRetry={load} />;
  if (!customers) return <Loader label="Loading reviews..." />;

  const config = {
    title: 'Customer Reviews',
    entityName: 'Review',
    service: reviewsService,
    searchKeys: ['comment'],
    defaultValues: {
      customerId: prefill.customerId || '',
      vehicleId: prefill.vehicleId || '',
      jobCardId: prefill.jobCardId || '',
      invoiceId: prefill.invoiceId || '',
      rating: '', serviceQualityRating: '', staffBehaviorRating: '', serviceTimeRating: '', priceSatisfactionRating: '',
      comment: '',
    },
    schema: reviewSchema,
    segments: [
      { value: 'ALL', label: 'All' },
      { value: 'NEGATIVE', label: 'Negative (≤2★)', predicate: (row) => Number(row.rating) <= 2 },
      { value: 'POSITIVE', label: 'Positive (≥4★)', predicate: (row) => Number(row.rating) >= 4 },
    ],
    columns: [
      { key: 'rating', label: 'Rating', sortable: true, render: (row) => <Stars value={row.rating} /> },
      { key: 'customerName', label: 'Customer' },
      { key: 'vehicleModel', label: 'Vehicle', render: (row) => row.vehicleModel ? `${row.vehicleModel} (${row.registrationNumber || ''})` : '—' },
      { key: 'jobCardNumber', label: 'Job Card', render: (row) => row.jobCardNumber || '—' },
      { key: 'comment', label: 'Comment', render: (row) => row.comment ? (row.comment.length > 60 ? `${row.comment.slice(0, 60)}…` : row.comment) : '—' },
      { key: 'createdAt', label: 'Date', render: (row) => (row.createdAt ? dayjs(row.createdAt).format('DD MMM YYYY') : '—') },
    ],
    fields: [
      {
        name: 'customerId', label: 'Customer', type: 'select', required: true,
        valueKey: 'id', labelKey: 'customerName', options: customers,
      },
      {
        name: 'vehicleId', label: 'Vehicle', type: 'select',
        valueKey: 'vehicleId', labelKey: 'vehicleModel',
        options: vehicles.map((v) => ({ vehicleId: v.vehicleId, vehicleModel: `${v.vehicleModel} (${v.registrationNumber || ''})` })),
      },
      {
        name: 'jobCardId', label: 'Job Card', type: 'select',
        valueKey: 'jobCardId', labelKey: 'jobCardNumber', options: jobCards,
      },
      { name: 'rating', label: 'Overall Rating', type: 'select', required: true, options: RATING_OPTIONS },
      { name: 'serviceQualityRating', label: 'Service Quality', type: 'select', options: RATING_OPTIONS },
      { name: 'staffBehaviorRating', label: 'Staff Behavior', type: 'select', options: RATING_OPTIONS },
      { name: 'serviceTimeRating', label: 'Service Time', type: 'select', options: RATING_OPTIONS },
      { name: 'priceSatisfactionRating', label: 'Price Satisfaction', type: 'select', options: RATING_OPTIONS },
      { name: 'comment', label: 'Comment', type: 'textarea', fullWidth: true },
    ],
  };

  return <CrudPage config={config} />;
}
