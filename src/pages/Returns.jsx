import { useState } from 'react';
import PurchaseReturns from './PurchaseReturns';
import SalesReturns from './SalesReturns';

// One "Returns" entry point, composing the two existing return screens as tabs — no data-layer
// change, just consolidated navigation (customer returns vs. supplier/purchase returns).
export default function Returns() {
  const [tab, setTab] = useState('customer');

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">Returns</h1>
      </div>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'customer' ? 'active' : ''}`} onClick={() => setTab('customer')}>
            Customer Returns
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'purchase' ? 'active' : ''}`} onClick={() => setTab('purchase')}>
            Purchase Returns
          </button>
        </li>
      </ul>
      {tab === 'customer' ? <SalesReturns /> : <PurchaseReturns />}
    </div>
  );
}
