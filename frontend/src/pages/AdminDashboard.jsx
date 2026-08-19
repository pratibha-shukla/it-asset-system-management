import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Container, Row, Col, Card, Badge, Button, Table, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import { adminApi }   from '../api/adminApi';
import { requestApi } from '../api/requestApi';
import { queryKeys }  from '../api/queryKeys';
import { usePageTitle } from '../hooks/usePageTitle';

import StatCard            from '../components/StatCard';
import RequestDetailModal  from '../features/admin/RequestDetailModal';
import FulfillModal        from '../features/admin/FulfillModal';

import './AdminDashboard.css';

/**
 * AdminDashboard — landing page for ADMIN role.
 *
 * Responsibilities:
 *   - Display system stats (assets, users, requests)
 *   - Show PENDING requests table with approve / reject / detail actions
 *   - Show APPROVED requests table with "Assign Asset" (fulfill) and reject actions
 *
 * All modals are imported from features/admin/ — not defined here.
 */
export default function AdminDashboard() {
  const qClient = useQueryClient();
  const [selectedReq, setSelectedReq] = useState(null); // open RequestDetailModal
  const [fulfillReq,  setFulfillReq]  = useState(null); // open FulfillModal

  usePageTitle('Admin Dashboard');

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn:  adminApi.getStats,
    refetchInterval: 60_000,
  });

  const { data: pendingData, isLoading: reqLoading } = useQuery({
    queryKey: queryKeys.requests.list({ status: 'PENDING', page: 0, size: 50 }),
    queryFn:  () => requestApi.getAll({ status: 'PENDING', page: 0, size: 50 }),
  });
  const pendingRequests = pendingData?.content || [];

  const { data: approvedData } = useQuery({
    queryKey: queryKeys.requests.list({ status: 'APPROVED', page: 0, size: 50 }),
    queryFn:  adminApi.getApprovedReqs,
    staleTime: 30_000,
  });
  const approvedRequests = approvedData?.content || [];

  const { data: assetsData } = useQuery({
    queryKey: ['assets', 'available'],
    queryFn:  adminApi.getAvailableAssets,
    staleTime: 30_000,
    enabled:  !!fulfillReq, // only fetch when the fulfill modal is open
  });
  const availableAssets = assetsData?.content || [];

  // ── Shared cache invalidation ─────────────────────────────────────────────
  const invalidateRequests = () => {
    qClient.invalidateQueries({ queryKey: queryKeys.requests.all() });
    qClient.invalidateQueries({ queryKey: queryKeys.admin.stats() });
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: ({ id, notes }) => requestApi.approve(id, notes),
    onSuccess: () => { invalidateRequests(); toast.success('Request approved!'); setSelectedReq(null); },
    onError:   () => toast.error('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }) => requestApi.reject(id, notes),
    onSuccess: () => { invalidateRequests(); toast.success('Request rejected'); setSelectedReq(null); },
    onError:   () => toast.error('Failed to reject'),
  });

  const fulfillMutation = useMutation({
    mutationFn: ({ id, assetId }) => adminApi.fulfillRequest(id, assetId),
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: queryKeys.requests.all() });
      qClient.invalidateQueries({ queryKey: queryKeys.admin.stats() });
      qClient.invalidateQueries({ queryKey: ['assets', 'available'] });
      toast.success('✅ Asset assigned and request fulfilled!');
      setFulfillReq(null);
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to fulfill request'),
  });

  const processing = approveMutation.isPending || rejectMutation.isPending;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const promptReject = (req) => {
    const n = window.prompt('Rejection reason:');
    if (n) rejectMutation.mutate({ id: req.id, notes: n });
  };

  const priorityVariant = (p) =>
    p === 'HIGH' ? 'danger' : p === 'MEDIUM' ? 'warning' : 'success';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Container fluid as="main" id="main-content" className="py-4 px-4">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold mb-0 fs-4">
          <span aria-hidden="true">🔑 </span>Admin Dashboard
        </h1>
        <nav aria-label="Admin quick links" className="d-flex gap-2">
          <Link to="/admin/users"      className="btn btn-outline-primary btn-sm">👥 Users</Link>
          <Link to="/admin/branches"   className="btn btn-outline-secondary btn-sm">🏢 Branches</Link>
          <Link to="/assets"           className="btn btn-outline-success btn-sm">🖥️ Assets</Link>
          <Link to="/admin/audit-logs" className="btn btn-outline-dark btn-sm">📋 Audit Logs</Link>
        </nav>
      </div>

      {/* Stats */}
      <section aria-label="System statistics" aria-busy={statsLoading} className="mb-4">
        <h2 className="sr-only">Statistics</h2>
        {statsLoading
          ? <div className="text-center py-4" role="status"><Spinner /></div>
          : (
            <Row className="g-3">
              <Col md={2}><StatCard label="Total Assets"     value={stats?.totalAssets}       icon="🖥️" variant="dark"    /></Col>
              <Col md={2}><StatCard label="Available"        value={stats?.availableAssets}   icon="✅" variant="success" /></Col>
              <Col md={2}><StatCard label="Assigned"         value={stats?.assignedAssets}    icon="👤" variant="primary" /></Col>
              <Col md={2}><StatCard label="Maintenance"      value={stats?.maintenanceAssets} icon="🔧" variant="warning" /></Col>
              <Col md={2}><StatCard label="Pending Requests" value={stats?.pendingRequests}   icon="⏳" variant="danger"  /></Col>
              <Col md={2}><StatCard label="Total Users"      value={stats?.totalUsers}        icon="👥" variant="info"    /></Col>
            </Row>
          )
        }
      </section>

      {/* Pending requests */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
          <h2 className="mb-0 fw-bold fs-6" id="pending-table-caption">
            <span aria-hidden="true">⏳ </span>Pending Requests
            {pendingRequests.length > 0 && (
              <Badge bg="danger" className="ms-2">{pendingRequests.length}</Badge>
            )}
          </h2>
          <Link to="/requests" className="btn btn-outline-primary btn-sm">View All</Link>
        </Card.Header>

        <Card.Body className="p-0">
          {reqLoading ? (
            <div className="text-center py-4" role="status"><Spinner /></div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-5 text-muted" role="status">
              <span aria-hidden="true" className="empty-icon-lg">🎉</span>
              <p>No pending requests!</p>
            </div>
          ) : (
            <Table hover responsive className="mb-0 table-fixed" aria-labelledby="pending-table-caption">
              <thead className="table-light">
                <tr>
                  <th className="col-id">ID</th>
                  <th className="col-name">Employee</th>
                  <th className="col-dept">Department</th>
                  <th>Product</th>
                  <th className="col-qty">Qty</th>
                  <th className="col-pri">Priority</th>
                  <th className="col-date">Date</th>
                  <th className="col-act">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map(req => (
                  <tr
                    key={req.id}
                    className="clickable-row"
                    onClick={() => setSelectedReq(req)}
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedReq(req); }}
                    aria-label={`Request from ${req.employeeName || req.user?.name} for ${req.productName}`}
                  >
                    <td><small className="text-muted">#{req.id}</small></td>
                    <td>
                      <div className="fw-semibold">{req.employeeName || req.user?.name || '—'}</div>
                      <small className="text-muted">{req.user?.email || '—'}</small>
                    </td>
                    <td><small>{req.department || '—'}</small></td>
                    <td>
                      <div className="fw-semibold word-break">{req.productName}</div>
                      {req.projectName && <small className="text-muted">📁 {req.projectName}</small>}
                    </td>
                    <td><Badge bg="secondary">{req.quantity || 1}</Badge></td>
                    <td><Badge bg={priorityVariant(req.priority)}>{req.priority}</Badge></td>
                    <td><small>{req.requestDate ? new Date(req.requestDate).toLocaleDateString() : '—'}</small></td>
                    <td>
                      <div className="d-flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="outline-info"   onClick={() => setSelectedReq(req)}>Details</Button>
                        <Button size="sm" variant="success"        onClick={() => approveMutation.mutate({ id: req.id, notes: 'Approved' })} disabled={processing}>✓</Button>
                        <Button size="sm" variant="outline-danger" onClick={() => promptReject(req)} disabled={processing}>✗</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Approved requests — awaiting asset assignment */}
      {approvedRequests.length > 0 && (
        <Card className="border-0 shadow-sm mt-4">
          <Card.Header className="bg-white py-3">
            <h2 className="mb-0 fw-bold fs-6">
              <span aria-hidden="true">✅ </span>Approved — Awaiting Asset Assignment
              <Badge bg="success" className="ms-2">{approvedRequests.length}</Badge>
            </h2>
          </Card.Header>
          <Card.Body className="p-0">
            <Table hover responsive className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th><th>Employee</th><th>Product</th>
                  <th>Priority</th><th>Date</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {approvedRequests.map(req => (
                  <tr key={req.id}>
                    <td><small className="text-muted">#{req.id}</small></td>
                    <td>
                      <div className="fw-semibold">{req.employeeName || req.user?.name || '—'}</div>
                      <small className="text-muted">{req.user?.email || '—'}</small>
                    </td>
                    <td><div className="fw-semibold">{req.productName}</div></td>
                    <td><Badge bg={priorityVariant(req.priority)}>{req.priority}</Badge></td>
                    <td><small>{req.requestDate ? new Date(req.requestDate).toLocaleDateString() : '—'}</small></td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="primary"        onClick={() => setFulfillReq(req)}>📦 Assign Asset</Button>
                        <Button size="sm" variant="outline-danger" onClick={() => promptReject(req)}>✗ Reject</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Modals */}
      <RequestDetailModal
        req={selectedReq}
        show={!!selectedReq}
        onHide={() => setSelectedReq(null)}
        onApprove={(id, notes) => approveMutation.mutate({ id, notes })}
        onReject={(id, notes)  => rejectMutation.mutate({ id, notes })}
        processing={processing}
      />

      {fulfillReq && (
        <FulfillModal
          req={fulfillReq}
          onHide={() => setFulfillReq(null)}
          onConfirm={(id, assetId) => fulfillMutation.mutate({ id, assetId })}
          isPending={fulfillMutation.isPending}
          availableAssets={availableAssets}
        />
      )}
    </Container>
  );
}
