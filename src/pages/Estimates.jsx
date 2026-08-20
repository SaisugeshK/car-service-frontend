import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import estimatesService from '../services/estimatesService';
import jobCardsService from '../services/jobCardsService';
import DataTable from '../components/DataTable';
import Loader from '../components/Loader';

const asList = (data) => (Array.isArray(data) ? data : data?.content || []);

export default function Estimates() {
  const [estimates, setEstimates] = useState(null);
  const [jobCards, setJobCards] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([estimatesService.getAll(), jobCardsService.getAll()]).then(([e, j]) => {
      setEstimates(asList(e).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setJobCards(asList(j));
    });
  }, []);

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
          { key: 'estimateNumber', label: 'Estimate #' },
          {
            key: 'jobCardId',
            label: 'Job Card',
            render: (row) => jobCards.find((j) => j.jobCardId === row.jobCardId)?.jobCardNumber || row.jobCardId,
          },
          { key: 'grandTotal', label: 'Amount', render: (row) => Number(row.grandTotal ?? 0).toFixed(2) },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <span className={`badge ${row.status === 'APPROVED' ? 'bg-success' : row.status === 'REJECTED' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                {row.status}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
