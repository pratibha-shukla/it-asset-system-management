import React, { useState } from 'react';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth }    from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { assetApi }   from '../api/assetApi';
import { adminApi }   from '../api/adminApi';
import { managerApi } from '../api/requestApi';
import { queryKeys }  from '../api/queryKeys';
import AssetCard      from '../components/AssetCard';
import './Dashboard.css';

const TYPE_CATEGORIES = ['All','Laptop','Monitor','Desktop','Printer','Tablet','Server','Keyboard','Mouse','Network Equipment'];

export default function Dashboard() {
  const { user, isAdmin, isManager } = useAuth();
  const [activeType, setActiveType] = useState('All');

  usePageTitle('Dashboard');

  const { data: stats } = useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn:  adminApi.getStats,
    enabled:  isAdmin,
  });

  const { data: teamStats } = useQuery({
    queryKey: queryKeys.manager.teamStats(),
    queryFn:  managerApi.getTeamStats,
    enabled:  isManager,
  });

  const { data: assetData, isLoading } = useQuery({
    queryKey: queryKeys.assets.search({ type: activeType === 'All' ? undefined : activeType, size: 12, sortBy: 'name' }),
    queryFn:  () => assetApi.search({ type: activeType === 'All' ? undefined : activeType, size: 12, sortBy: 'name' }),
    staleTime: 2 * 60 * 1000,
  });

  const assets = assetData?.content || [];

  return (
    /* WCAG 2.4.1: main landmark + id for skip-link target */
    <Container fluid as="main" id="main-content" className="py-4 px-4 dashboard-page">

      {/* Welcome Banner */}
      <section aria-label="Welcome banner" className="dashboard-banner">
        <div>
          {/* WCAG 1.3.1: h1 is the primary page heading */}
          <h1 className="fw-bold mb-1 dashboard-banner__title">
            <span aria-hidden="true">👋 </span>Welcome back, {user?.name}!
          </h1>
          <p className="mb-3 dashboard-banner__sub">
            {user?.role} · {user?.branchName || 'Head Office'} · Browse and request IT assets below
          </p>
          <div className="d-flex gap-2 flex-wrap">
            <Link to="/requests/new" className="btn btn-light btn-sm fw-semibold">+ Request Asset</Link>
            <Link to="/assets"       className="btn btn-outline-light btn-sm">View All Assets</Link>
            {isManager && (
              <Link to="/manager/requests" className="btn btn-info btn-sm fw-semibold">
                <span aria-hidden="true">👥 </span>Team Requests
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="btn btn-warning btn-sm fw-semibold">
                <span aria-hidden="true">⚙️ </span>Admin Panel
              </Link>
            )}
          </div>
        </div>
        {/* Decorative */}
        <span aria-hidden="true" className="dashboard-banner__emoji">🖥️</span>
      </section>

      {/* Manager Team Stats */}
      {isManager && teamStats && (
        <section aria-label="Team statistics" className="mb-4">
          <h2 className="fw-semibold fs-6 mb-3 text-muted text-uppercase" style={{ letterSpacing: 1 }}>
            👥 My Team Overview
          </h2>
          <Row className="g-3">
            {[
              { label: 'Team Members',      value: teamStats.totalMembers,       icon: '👤', color: '#0d6efd' },
              { label: 'Assets Assigned',   value: teamStats.assignedAssets,     icon: '🖥️', color: '#198754' },
              { label: 'Pending Approvals', value: teamStats.pendingRequests,    icon: '⏳', color: '#dc3545' },
              { label: 'Approved This Month', value: teamStats.approvedThisMonth, icon: '✅', color: '#20c997' },
            ].map(s => (
              <Col key={s.label} xs={6} md={3}>
                <Card className="border-0 shadow-sm text-center py-3">
                  <span aria-hidden="true" className="stat-icon">{s.icon}</span>
                  <span className="stat-value" style={{ color: s.color }}
                    aria-label={`${s.label}: ${s.value ?? 'loading'}`}>
                    {s.value ?? '—'}
                  </span>
                  <span className="stat-label" aria-hidden="true">{s.label}</span>
                </Card>
              </Col>
            ))}
          </Row>
        </section>
      )}

      {/* Admin Stats */}
      {isAdmin && stats && (
        <section aria-label="Key statistics" className="mb-4">
          <h2 className="sr-only">Statistics</h2>
          <Row className="g-3">
            {[
              { label: 'Total Assets',   value: stats.totalAssets,       icon: '🖥️', color: '#1e3a5f' },
              { label: 'Available',      value: stats.availableAssets,   icon: '✅', color: '#198754' },
              { label: 'Assigned',       value: stats.assignedAssets,    icon: '👤', color: '#0d6efd' },
              { label: 'Maintenance',    value: stats.maintenanceAssets, icon: '🔧', color: '#92400e' },
              { label: 'Pending Requests', value: stats.pendingRequests, icon: '⏳', color: '#dc3545' },
              { label: 'Total Users',    value: stats.totalUsers,        icon: '👥', color: '#6f42c1' },
            ].map(s => (
              <Col key={s.label} xs={6} md={2}>
                {/* WCAG 4.1.2: stat value has aria-label for screen readers */}
                <Card className="border-0 shadow-sm text-center py-3">
                  <span aria-hidden="true" className="stat-icon">{s.icon}</span>
                  <span
                    className="stat-value"
                    style={{ color: s.color }}
                    aria-label={`${s.label}: ${s.value ?? 'loading'}`}
                  >
                    {s.value ?? '—'}
                  </span>
                  <span className="stat-label" aria-hidden="true">{s.label}</span>
                </Card>
              </Col>
            ))}
          </Row>
        </section>
      )}

      {/* Category Filter */}
      <section aria-label="Asset catalog">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="fw-bold mb-0 fs-5">
            <span aria-hidden="true">🛒 </span>Asset Catalog
          </h2>
          <Link to="/assets" className="btn btn-outline-primary btn-sm">View All →</Link>
        </div>

        {/*
          WCAG 4.1.2: toggle-button group.
          role="group" + aria-label names the group; aria-pressed marks active state.
        */}
        <div
          role="group"
          aria-label="Filter assets by type"
          className="d-flex gap-2 flex-wrap mb-4"
        >
          {TYPE_CATEGORIES.map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              aria-pressed={activeType === type}
              className={`filter-btn${activeType === type ? ' filter-btn--active' : ''}`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* WCAG 4.1.3: aria-live="polite" announces result changes to screen readers */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {!isLoading && `${assets.length} ${activeType === 'All' ? '' : activeType} assets shown`}
        </div>

        {isLoading ? (
          <div className="text-center py-5" role="status" aria-label="Loading assets">
            <Spinner variant="primary" aria-hidden="true" />
            <div className="mt-2 text-muted">Loading assets…</div>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <span aria-hidden="true" className="empty-icon">📦</span>
            <p>No assets found for this category</p>
            <Link to="/assets" className="btn btn-outline-primary btn-sm mt-3">Browse All Assets</Link>
          </div>
        ) : (
          <Row className="g-3">
            {assets.map(asset => (
              <Col key={asset.id} xs={12} sm={6} md={4} lg={3}>
                <AssetCard asset={asset} isAdmin={isAdmin} onAssign={null} onEdit={null} onDelete={null} />
              </Col>
            ))}
          </Row>
        )}
      </section>

      {/* Quick Links */}
      <nav aria-label="Quick links" className="mt-4">
        <h2 className="sr-only">Quick links</h2>
        <Row className="g-3">
          {[
            { to: '/requests/new', icon: '📋', label: 'Request an Asset',  sub: 'Submit a new asset request',      bg: 'linear-gradient(135deg,#0d6efd,#6610f2)' },
            { to: '/requests',     icon: '📂', label: 'My Requests',       sub: 'Track your request status',       bg: 'linear-gradient(135deg,#198754,#20c997)' },
            { to: '/assets',       icon: '🖥️', label: 'Full Inventory',    sub: 'Browse all available assets',     bg: 'linear-gradient(135deg,#dc3545,#fd7e14)' },
          ].map(({ to, icon, label, sub, bg }) => (
            <Col key={to} md={4}>
              <Card
                as={Link} to={to}
                className="border-0 shadow-sm text-decoration-none quick-link-card"
                style={{ background: bg }}
                aria-label={label}
              >
                <Card.Body className="d-flex align-items-center gap-3 py-4">
                  <span aria-hidden="true" className="quick-link-card__icon">{icon}</span>
                  <div>
                    <div className="fw-bold fs-6">{label}</div>
                    <small className="quick-link-card__sub">{sub}</small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </nav>

    </Container>
  );
}
