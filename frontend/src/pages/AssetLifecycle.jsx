import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Container, Row, Col, Card, Table, Badge, Spinner } from 'react-bootstrap';
import { assetApi } from '../api/assetApi';
import { usePageTitle } from '../hooks/usePageTitle';
import './AssetLifecycle.css';

// ─── Depreciation config (useful life in years per asset type) ────────────────
const USEFUL_LIFE = {
  Laptop: 3, Desktop: 4, Server: 5, Monitor: 5,
  Printer: 5, Keyboard: 3, Mouse: 3, Tablet: 3,
  'Network Equipment': 5, Other: 3,
};

function getAgeYears(purchaseDate) {
  if (!purchaseDate) return null;
  return (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function getDepreciatedValue(asset) {
  const price = Number(asset.purchasePrice);
  if (!price || !asset.purchaseDate) return price || 0;
  const life = USEFUL_LIFE[asset.type] || 3;
  const age  = getAgeYears(asset.purchaseDate);
  return Math.max(0, price * (1 - age / life));
}

function getWarrantyStatus(asset) {
  if (!asset.warrantyExpiry) return 'unknown';
  const daysLeft = (new Date(asset.warrantyExpiry) - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0)   return 'expired';
  if (daysLeft <= 90) return 'expiring';
  return 'valid';
}

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, variant = 'primary' }) {
  return (
    <Card className="lifecycle-card h-100">
      <Card.Body className="d-flex justify-content-between align-items-center">
        <div>
          <div className="card-label mb-1">{label}</div>
          <div className={`card-value text-${variant}`}>{value}</div>
        </div>
        <span className="card-icon">{icon}</span>
      </Card.Body>
    </Card>
  );
}

function WarrantyBadge({ asset }) {
  const status = getWarrantyStatus(asset);
  const map = {
    expired:  { cls: 'badge-expired',  text: 'Expired' },
    expiring: { cls: 'badge-expiring', text: 'Expiring ≤90d' },
    valid:    { cls: 'badge-valid',    text: 'Valid' },
    unknown:  { cls: 'badge-unknown',  text: 'No data' },
  };
  const { cls, text } = map[status];
  return <span className={`badge ${cls}`}>{text}</span>;
}

// ─── Finance Tab ──────────────────────────────────────────────────────────────
function FinanceTab({ allAssets }) {
  const totalPurchase    = allAssets.reduce((s, a) => s + Number(a.purchasePrice || 0), 0);
  const totalDepreciated = allAssets.reduce((s, a) => s + getDepreciatedValue(a), 0);
  const retiredValue     = allAssets.filter(a => a.status === 'RETIRED')
                                    .reduce((s, a) => s + Number(a.purchasePrice || 0), 0);
  const activeValue      = allAssets.filter(a => a.status !== 'RETIRED')
                                    .reduce((s, a) => s + Number(a.purchasePrice || 0), 0);

  // Group by type
  const byType = useMemo(() => {
    const map = {};
    allAssets.forEach(a => {
      const t = a.type || 'Other';
      if (!map[t]) map[t] = { count: 0, purchase: 0, depreciated: 0 };
      map[t].count++;
      map[t].purchase    += Number(a.purchasePrice || 0);
      map[t].depreciated += getDepreciatedValue(a);
    });
    return Object.entries(map).sort((x, y) => y[1].purchase - x[1].purchase);
  }, [allAssets]);

  return (
    <>
      <Row className="g-3 mb-4">
        <Col md={3}><SummaryCard icon="💼" label="Total Portfolio Value"  value={fmt(totalPurchase)}    variant="primary" /></Col>
        <Col md={3}><SummaryCard icon="📉" label="Estimated Current Value" value={fmt(totalDepreciated)} variant="success" /></Col>
        <Col md={3}><SummaryCard icon="✅" label="Active Assets Value"     value={fmt(activeValue)}      variant="info"    /></Col>
        <Col md={3}><SummaryCard icon="🗃️" label="Retired Assets Value"    value={fmt(retiredValue)}     variant="secondary"/></Col>
      </Row>

      <Card className="lifecycle-card">
        <Card.Header className="bg-white fw-bold py-3">
          💰 Value by Asset Type
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Type</th>
                <th className="text-center">Count</th>
                <th>Purchase Cost</th>
                <th>Estimated Value</th>
                <th>Depreciation</th>
                <th style={{ width: 160 }}>Retained Value</th>
              </tr>
            </thead>
            <tbody>
              {byType.map(([type, d]) => {
                const pct = d.purchase > 0 ? (d.depreciated / d.purchase) * 100 : 0;
                return (
                  <tr key={type} className="finance-type-row">
                    <td><strong>{type}</strong></td>
                    <td className="text-center"><Badge bg="secondary">{d.count}</Badge></td>
                    <td className="fw-semibold">{fmt(d.purchase)}</td>
                    <td className="text-success fw-semibold">{fmt(d.depreciated)}</td>
                    <td className="text-danger">{fmt(d.purchase - d.depreciated)}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="depreciation-bar flex-grow-1">
                          <div className="depreciation-bar__fill" style={{ width: `${pct.toFixed(0)}%` }} />
                        </div>
                        <small className="text-muted">{pct.toFixed(0)}%</small>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="table-light">
              <tr>
                <td><strong>Total</strong></td>
                <td className="text-center"><Badge bg="dark">{allAssets.length}</Badge></td>
                <td className="fw-bold">{fmt(totalPurchase)}</td>
                <td className="fw-bold text-success">{fmt(totalDepreciated)}</td>
                <td className="fw-bold text-danger">{fmt(totalPurchase - totalDepreciated)}</td>
                <td>
                  {totalPurchase > 0 && (
                    <small className="text-muted">
                      {((totalDepreciated / totalPurchase) * 100).toFixed(0)}% retained
                    </small>
                  )}
                </td>
              </tr>
            </tfoot>
          </Table>
        </Card.Body>
      </Card>
    </>
  );
}

// ─── Retirement Tab helpers — module level so React never remounts them ────────

function daysLeft(asset) {
  if (!asset.warrantyExpiry) return null;
  return Math.floor((new Date(asset.warrantyExpiry) - Date.now()) / (1000 * 60 * 60 * 24));
}

function WarrantyAssetTable({ assets, emptyMsg }) {
  if (assets.length === 0)
    return <div className="text-center py-4 text-muted">{emptyMsg}</div>;
  return (
    <Table responsive hover className="mb-0">
      <thead className="table-light">
        <tr>
          <th>Asset</th><th>Type</th><th>Serial #</th><th>Purchase Date</th>
          <th>Warranty Expiry</th><th>Warranty</th><th>Purchase Cost</th>
          <th>Est. Value</th><th>Branch</th>
        </tr>
      </thead>
      <tbody>
        {assets.map(a => (
          <tr key={a.id}>
            <td>
              <div className="fw-semibold">{a.name}</div>
              <small className="text-muted">{a.manufacturer}</small>
            </td>
            <td><Badge bg="secondary">{a.type}</Badge></td>
            <td><small className="font-monospace">{a.serialNumber}</small></td>
            <td><small>{a.purchaseDate || '—'}</small></td>
            <td>
              <small>
                {a.warrantyExpiry || '—'}
                {daysLeft(a) !== null && daysLeft(a) < 0 && (
                  <span className="text-danger ms-1">({Math.abs(daysLeft(a))}d ago)</span>
                )}
                {daysLeft(a) !== null && daysLeft(a) >= 0 && (
                  <span className="text-warning ms-1">({daysLeft(a)}d left)</span>
                )}
              </small>
            </td>
            <td><WarrantyBadge asset={a} /></td>
            <td className="fw-semibold">{fmt(a.purchasePrice)}</td>
            <td className="text-success">{fmt(getDepreciatedValue(a))}</td>
            <td><small>{a.branchName || '—'}</small></td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

// ─── Retirement Tab ───────────────────────────────────────────────────────────
function RetirementTab({ allAssets, retiredAssets }) {
  const expired      = allAssets.filter(a => a.status !== 'RETIRED' && getWarrantyStatus(a) === 'expired');
  const expiringSoon = allAssets.filter(a => a.status !== 'RETIRED' && getWarrantyStatus(a) === 'expiring');

  return (
    <>
      <Row className="g-3 mb-4">
        <Col md={3}><SummaryCard icon="🗃️" label="Already Retired"         value={retiredAssets.length}  variant="secondary" /></Col>
        <Col md={3}><SummaryCard icon="🔴" label="Warranty Expired"         value={expired.length}        variant="danger"    /></Col>
        <Col md={3}><SummaryCard icon="🟡" label="Expiring within 90 days"  value={expiringSoon.length}   variant="warning"   /></Col>
        <Col md={3}><SummaryCard icon="💸" label="Est. Replacement Cost"
          value={fmt([...expired, ...expiringSoon].reduce((s, a) => s + Number(a.purchasePrice || 0), 0))}
          variant="primary" /></Col>
      </Row>

      {/* Warranty-expired candidates */}
      {expired.length > 0 && (
        <Card className="lifecycle-card mb-3">
          <Card.Header className="bg-danger bg-opacity-10 fw-bold py-3 d-flex justify-content-between">
            <span>🔴 Warranty Expired — Retirement Candidates ({expired.length})</span>
            <Badge bg="danger">{expired.length}</Badge>
          </Card.Header>
          <Card.Body className="p-0">
            <WarrantyAssetTable assets={expired} emptyMsg="No expired warranty assets" />
          </Card.Body>
        </Card>
      )}

      {/* Expiring soon */}
      {expiringSoon.length > 0 && (
        <Card className="lifecycle-card mb-3">
          <Card.Header className="bg-warning bg-opacity-10 fw-bold py-3 d-flex justify-content-between">
            <span>🟡 Warranty Expiring within 90 Days ({expiringSoon.length})</span>
            <Badge bg="warning" text="dark">{expiringSoon.length}</Badge>
          </Card.Header>
          <Card.Body className="p-0">
            <WarrantyAssetTable assets={expiringSoon} emptyMsg="No assets expiring soon" />
          </Card.Body>
        </Card>
      )}

      {/* Already retired */}
      <Card className="lifecycle-card">
        <Card.Header className="bg-white fw-bold py-3 d-flex justify-content-between">
          <span>🗃️ Retired Assets ({retiredAssets.length})</span>
          <Badge bg="secondary">{retiredAssets.length}</Badge>
        </Card.Header>
        <Card.Body className="p-0">
          <WarrantyAssetTable assets={retiredAssets} emptyMsg="No retired assets" />
        </Card.Body>
      </Card>
    </>
  );
}

// ─── Maintenance Tab ──────────────────────────────────────────────────────────
function MaintenanceTab({ maintenanceAssets, allAssets }) {
  const totalAssets = allAssets.length;
  const maintenancePct = totalAssets > 0
    ? ((maintenanceAssets.length / totalAssets) * 100).toFixed(1)
    : 0;

  // Assets needing attention: warranty expired but still AVAILABLE/ASSIGNED
  const needsReview = allAssets.filter(a =>
    ['AVAILABLE', 'ASSIGNED'].includes(a.status) && getWarrantyStatus(a) === 'expired'
  );

  return (
    <>
      <Row className="g-3 mb-4">
        <Col md={3}><SummaryCard icon="🔧" label="In Maintenance"       value={maintenanceAssets.length} variant="warning"   /></Col>
        <Col md={3}><SummaryCard icon="📊" label="Maintenance Rate"      value={`${maintenancePct}%`}     variant="primary"   /></Col>
        <Col md={3}><SummaryCard icon="⚠️" label="Needs Review"         value={needsReview.length}       variant="danger"    /></Col>
        <Col md={3}><SummaryCard icon="💰" label="Maintenance Asset Cost"
          value={fmt(maintenanceAssets.reduce((s, a) => s + Number(a.purchasePrice || 0), 0))}
          variant="secondary" /></Col>
      </Row>

      {/* In maintenance */}
      <Card className="lifecycle-card mb-3">
        <Card.Header className="bg-warning bg-opacity-10 fw-bold py-3">
          🔧 Currently in Maintenance ({maintenanceAssets.length})
        </Card.Header>
        <Card.Body className="p-0">
          {maintenanceAssets.length === 0
            ? <div className="text-center py-4 text-muted">No assets in maintenance</div>
            : (
              <Table responsive hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Asset</th>
                    <th>Type</th>
                    <th>Serial #</th>
                    <th>Branch</th>
                    <th>Purchase Date</th>
                    <th>Warranty</th>
                    <th>Purchase Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceAssets.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div className="fw-semibold">{a.name}</div>
                        <small className="text-muted">{a.manufacturer} · {a.model}</small>
                      </td>
                      <td><Badge bg="warning" text="dark">{a.type}</Badge></td>
                      <td><small className="font-monospace">{a.serialNumber}</small></td>
                      <td><small>{a.branchName || '—'}</small></td>
                      <td><small>{a.purchaseDate || '—'}</small></td>
                      <td><WarrantyBadge asset={a} /></td>
                      <td className="fw-semibold">{fmt(a.purchasePrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
        </Card.Body>
      </Card>

      {/* Needs review */}
      {needsReview.length > 0 && (
        <Card className="lifecycle-card">
          <Card.Header className="bg-danger bg-opacity-10 fw-bold py-3">
            ⚠️ Warranty Expired — Consider Maintenance or Retirement ({needsReview.length})
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Asset</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Warranty Expired</th>
                  <th>Assigned To</th>
                  <th>Branch</th>
                  <th>Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {needsReview.map(a => {
                  const age = getAgeYears(a.purchaseDate);
                  const life = USEFUL_LIFE[a.type] || 3;
                  const action = age && age > life * 1.5 ? 'Retire' : 'Inspect';
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="fw-semibold">{a.name}</div>
                        <small className="text-muted">{a.serialNumber}</small>
                      </td>
                      <td><Badge bg="primary">{a.status}</Badge></td>
                      <td><Badge bg="secondary">{a.type}</Badge></td>
                      <td><small className="text-danger">{a.warrantyExpiry}</small></td>
                      <td><small>{a.assignedToName || '—'}</small></td>
                      <td><small>{a.branchName || '—'}</small></td>
                      <td>
                        <Badge bg={action === 'Retire' ? 'danger' : 'warning'} text={action === 'Retire' ? undefined : 'dark'}>
                          {action}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AssetLifecycle() {
  const [activeTab, setActiveTab] = useState('finance');

  usePageTitle('Asset Lifecycle & Finance');

  // Fetch all asset statuses in parallel
  const { data: allData,         isLoading: l1 } = useQuery({
    queryKey: ['assets', 'lifecycle', 'all'],
    queryFn:  () => assetApi.search({ size: 500, sortBy: 'name' }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: retiredData,      isLoading: l2 } = useQuery({
    queryKey: ['assets', 'lifecycle', 'retired'],
    queryFn:  () => assetApi.search({ status: 'RETIRED', size: 200, sortBy: 'name' }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: maintenanceData,  isLoading: l3 } = useQuery({
    queryKey: ['assets', 'lifecycle', 'maintenance'],
    queryFn:  () => assetApi.search({ status: 'MAINTENANCE', size: 200, sortBy: 'name' }),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading      = l1 || l2 || l3;
  const allAssets      = allData?.content         || [];
  const retiredAssets  = retiredData?.content     || [];
  const maintenanceAssets = maintenanceData?.content || [];

  const tabs = [
    { id: 'finance',     label: '💰 Finance',     count: null },
    { id: 'retirement',  label: '🗃️ Retirement',  count: retiredAssets.length },
    { id: 'maintenance', label: '🔧 Maintenance',  count: maintenanceAssets.length },
  ];

  return (
    <Container fluid as="main" id="main-content" className="py-4 px-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fw-bold mb-0 fs-4">📊 Asset Lifecycle & Finance</h1>
          <small className="text-muted">
            {allAssets.length} total assets · depreciation based on asset type useful life
          </small>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <Spinner variant="primary" />
          <div className="mt-2 text-muted">Loading asset data…</div>
        </div>
      ) : (
        <>
          {/* Tab bar */}
          <ul className="nav lifecycle-tabs border-bottom mb-4">
            {tabs.map(t => (
              <li className="nav-item" key={t.id}>
                <button
                  className={`nav-link${activeTab === t.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                  type="button"
                  aria-selected={activeTab === t.id}
                >
                  {t.label}
                  {t.count !== null && t.count > 0 && (
                    <Badge bg={t.id === 'retirement' ? 'secondary' : 'warning'} text={t.id === 'retirement' ? undefined : 'dark'} className="ms-2">
                      {t.count}
                    </Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* Tab content */}
          {activeTab === 'finance'     && <FinanceTab     allAssets={allAssets} />}
          {activeTab === 'retirement'  && <RetirementTab  allAssets={allAssets} retiredAssets={retiredAssets} />}
          {activeTab === 'maintenance' && <MaintenanceTab allAssets={allAssets} maintenanceAssets={maintenanceAssets} />}
        </>
      )}
    </Container>
  );
}
