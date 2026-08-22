import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jobCardsService from '../services/jobCardsService';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

// Not a separate data surface — jobs currently in the INSPECTION stage, opening straight into
// that job card's Inspection tab. See spec: inspections live on the job card, not their own table.
export default function Inspections() {
  const [jobCards, setJobCards] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoadError(false);
    jobCardsService
      .getAll()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.content || [];
        setJobCards(list.filter((j) => ['RECEIVED', 'INSPECTION'].includes(j.status)));
      })
      .catch(() => setLoadError(true));
  };

  useEffect(load, []);

  if (loadError) return <ErrorPage message="Could not load inspections. Check your connection and try again." onRetry={load} />;
  if (!jobCards) return <Loader label="Loading inspections..." />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Inspections</h1>
      </div>
      <DataTable
        rows={jobCards}
        keyField="jobCardId"
        emptyTitle="No vehicles awaiting inspection"
        emptyMessage="New job cards needing inspection will show up here."
        onRowClick={(row) => navigate(`/job-cards/${row.jobCardId}`)}
        columns={[
          { key: 'jobCardNumber', label: 'Job Card #', sortable: true },
          { key: 'customerName', label: 'Customer' },
          { key: 'vehicleModel', label: 'Vehicle' },
          { key: 'registrationNumber', label: 'Registration No.' },
          { key: 'complaint', label: 'Complaint' },
          {
            key: 'status',
            label: 'Status',
            render: (row) => <span className="badge bg-info text-dark">{row.status}</span>,
          },
        ]}
      />
    </div>
  );
}
