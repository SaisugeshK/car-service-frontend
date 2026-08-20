import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jobCardsService from '../services/jobCardsService';
import Loader from '../components/Loader';

const COLUMNS = [
  'RECEIVED', 'INSPECTION', 'WAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS',
  'WAITING_FOR_PARTS', 'QUALITY_CHECK', 'READY_FOR_DELIVERY', 'DELIVERED',
];

const COLUMN_LABEL = {
  RECEIVED: 'New', INSPECTION: 'Inspection', WAITING_APPROVAL: 'Waiting Approval', APPROVED: 'Approved',
  IN_PROGRESS: 'In Progress', WAITING_FOR_PARTS: 'Waiting Parts', QUALITY_CHECK: 'Quality Check',
  READY_FOR_DELIVERY: 'Ready', DELIVERED: 'Delivered',
};

export default function WorkshopBoard() {
  const [jobCards, setJobCards] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    jobCardsService.getAll().then((data) => setJobCards(Array.isArray(data) ? data : data?.content || []));
  }, []);

  if (!jobCards) return <Loader label="Loading workshop board..." />;

  const active = jobCards.filter((j) => j.status !== 'CANCELLED');

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Workshop Board</h1>
      </div>
      <div className="d-flex gap-3" style={{ overflowX: 'auto', paddingBottom: 8 }}>
        {COLUMNS.map((status) => {
          const cards = active.filter((j) => j.status === status);
          return (
            <div key={status} style={{ minWidth: 250, flexShrink: 0 }}>
              <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                <span className="fw-semibold small text-uppercase text-secondary">{COLUMN_LABEL[status]}</span>
                <span className="badge bg-secondary">{cards.length}</span>
              </div>
              <div className="d-flex flex-column gap-2">
                {cards.map((jc) => (
                  <div
                    key={jc.jobCardId}
                    className="erp-card p-2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/job-cards/${jc.jobCardId}`)}
                  >
                    <div className="fw-semibold small">{jc.registrationNumber || '—'}</div>
                    <div className="text-secondary" style={{ fontSize: '0.78rem' }}>{jc.vehicleModel}</div>
                    <div style={{ fontSize: '0.72rem' }} className="text-secondary">{jc.jobCardNumber}</div>
                    {jc.complaint && <div className="small mt-1" style={{ fontSize: '0.78rem' }}>{jc.complaint}</div>}
                    {jc.technicianName && (
                      <div className="mt-1">
                        <span className="badge erp-badge-service">{jc.technicianName}</span>
                      </div>
                    )}
                  </div>
                ))}
                {cards.length === 0 && <div className="text-secondary small px-1">No jobs</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
