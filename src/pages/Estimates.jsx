import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import estimatesService from '../services/estimatesService';
import jobCardsService from '../services/jobCardsService';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';
import ErrorPage from './ErrorPage';

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

export default function Estimates() {
  const [estimates, setEstimates] = useState(null);
  const [jobCards, setJobCards] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoadError(false);
    Promise.all([estimatesService.getAll(), jobCardsService.getAll()])
      .then(([e, j]) => {
        setEstimates(asList(e).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setJobCards(asList(j));
      })
      .catch(() => setLoadError(true));
  };

  useEffect(load, []);

  if (loadError) return <ErrorPage message="Could not load estimates. Check your connection and try again." onRetry={load} />;
  if (!estimates) return <Loader label="Loading estimates..." />;

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Estimates</h1>
      </div>
      <DataTable
        rows={estimates}
        keyField="estimateId"
        emptyTitle="No estimates yet"
        emptyMessage="Estimates are created from a job card's Estimate tab."
        onRowClick={(row) => navigate(`/job-cards/${row.jobCardId}`)}
        columns={[
          {
            key: 'estimateNumber',
            label: 'Estimate #',
            render: (row) => `${row.estimateNumber}${(row.revisionNumber || 1) > 1 ? ` REV ${row.revisionNumber}` : ''}`,
          },
          {
            key: 'jobCardId',
            label: 'Job Card',
            render: (row) => jobCards.find((j) => j.jobCardId === row.jobCardId)?.jobCardNumber || row.jobCardId,
          },
          { key: 'grandTotal', label: 'Amount', render: (row) => Number(row.grandTotal ?? 0).toFixed(2) },
          {
            key: 'validUntil',
            label: 'Valid Until',
            render: (row) => {
              if (!row.validUntil) return '—';
              const expired = dayjs(row.validUntil).isBefore(dayjs(), 'day') && row.status === 'PENDING';
              return <span className={expired ? 'text-danger fw-semibold' : ''}>{dayjs(row.validUntil).format('DD MMM YYYY')}{expired && ' (expired)'}</span>;
            },
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => {
              const tone = row.status === 'APPROVED' ? 'bg-success'
                : row.status === 'REJECTED' ? 'bg-danger'
                : row.status === 'CHANGES_REQUESTED' ? 'bg-info text-dark'
                : 'bg-warning text-dark';
              return <span className={`badge ${tone}`}>{row.status.replace('_', ' ')}</span>;
            },
          },
        ]}
      />
    </div>
  );
}
