import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Card, Table, Badge, Button,
  Spinner, Form, Row, Col, InputGroup, Modal,
} from 'react-bootstrap';
import { managerApi }  from '../api/requestApi';
import { queryKeys }   from '../api/queryKeys';
import { usePageTitle } from '../hooks/usePageTitle';
import './ManagerRequests.css';

const STATUS_VARIANT = {
  PENDING:  'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  FULFILLED: 'primary',
};

const PRIORITY_VARIANT = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'success' };

/* ── Approve / Reject modal ─────────────────────────────────── */
function ActionModal({ request, action, onClose, onConfirm, isPending }) {
  const [notes, setNotes] = useState('');
  if (!request) return null;

  return (
    <Modal show onHide={onClose} centered aria-labelledby="action-modal-title">
      <Modal.Header closeButton>
        <Modal.Title id="action-modal-title">
          {action === 'approve' ? '✅ Approve Request' : '❌ Reject Request'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-1">
          <strong>{request.employeeName}</strong> — {request.productName}
        </p>
        <Form.Group className="mt-3">
          <Form.Label className="fw-semibold">
            Notes <span className="text-muted fw-normal">(optional)</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder={action === 'approve' ? 'Approval note…' : 'Reason for rejection…'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ resize: 'none' }}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button
          variant={action === 'approve' ? 'success' : 'danger'}
          onClick={() => onConfirm(request.id, notes)}
          disabled={isPending}
        >
          {isPending
            ? <Spinner size="sm" />
            : action === 'approve' ? 'Approve' : 'Reject'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ── Main page ──────────────────────────────────────────────── */
export default function ManagerRequests() {
  usePageTitle('Team Requests');

  const qc = useQueryClient();

  const [page,   setPage]   = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [modal,  setModal]  = useState(null); // { request, action }

  const params = { page, size: 20, status: status || undefined, search: search || undefined };

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.manager.teamRequests(params),
    queryFn:  () => managerApi.getTeamRequests(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.manager.teamRequests({}) });
    qc.invalidateQueries({ queryKey: queryKeys.manager.teamStats() });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }) => managerApi.approve(id, notes),
    onSuccess: () => { invalidate(); setModal(null); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }) => managerApi.reject(id, notes),
    onSuccess: () => { invalidate(); setModal(null); },
  });

  const handleConfirm = (id, notes) => {
    if (modal.action === 'approve') approveMutation.mutate({ id, notes });
    else                            rejectMutation.mutate({ id, notes });
  };

  const requests  = data?.content       || [];
  const total     = data?.totalElements || 0;
  const isMutating = approveMutation.isPending || rejectMutation.isPending;

  return (
    <Container fluid as="main" id="main-content" className="py-4 px-4">

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fw-bold mb-0 fs-4">👥 Team Asset Requests</h1>
          <small className="text-muted" aria-live="polite">
            {total.toLocaleString()} request{total !== 1 ? 's' : ''} from your team
          </small>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Body className="py-3">
          <Row className="g-2 align-items-end">
            <Col md={4}>
              <Form.Label className="small fw-semibold mb-1">Search employee / product</Form.Label>
              <InputGroup>
                <InputGroup.Text>🔍</InputGroup.Text>
                <Form.Control
                  placeholder="Employee name or product…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                />
                {search && (
                  <Button variant="outline-secondary" onClick={() => { setSearch(''); setPage(0); }}>✕</Button>
                )}
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Label className="small fw-semibold mb-1">Status</Form.Label>
              <Form.Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="FULFILLED">Fulfilled</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button
                variant="outline-secondary"
                className="w-100"
                onClick={() => { setStatus(''); setSearch(''); setPage(0); }}
              >
                Reset
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Pending alert banner */}
      {data?.pendingCount > 0 && (
        <div className="alert alert-warning d-flex align-items-center gap-2 py-2 mb-3" role="alert">
          <span>⏳</span>
          <small>
            <strong>{data.pendingCount} pending request{data.pendingCount !== 1 ? 's' : ''}</strong> waiting for your approval.
          </small>
        </div>
      )}

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {isLoading ? (
            <div className="text-center py-5" role="status">
              <Spinner variant="primary" />
              <div className="mt-2 text-muted">Loading team requests…</div>
            </div>
          ) : isError ? (
            <div className="alert alert-danger m-3">Failed to load team requests.</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <div className="manager-empty-icon">📭</div>
              <p>No requests found from your team.</p>
            </div>
          ) : (
            <Table hover responsive className="mb-0" aria-label="Team asset requests">
              <thead className="table-dark">
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Employee</th>
                  <th scope="col">Product / Justification</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th scope="col">Date</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className={r.status === 'PENDING' ? 'manager-row--pending' : ''}>
                    <td><small className="text-muted">#{r.id}</small></td>
                    <td>
                      <div className="fw-semibold">{r.employeeName}</div>
                      <small className="text-muted">{r.employeeEmail}</small>
                    </td>
                    <td>
                      <div className="fw-semibold">{r.productName}</div>
                      <small className="text-muted">
                        {r.justification?.slice(0, 70)}{r.justification?.length > 70 ? '…' : ''}
                      </small>
                    </td>
                    <td>
                      <Badge bg={PRIORITY_VARIANT[r.priority] || 'secondary'}>
                        {r.priority}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={STATUS_VARIANT[r.status] || 'secondary'}>
                        {r.status}
                      </Badge>
                    </td>
                    <td>
                      <small>{r.requestDate ? new Date(r.requestDate).toLocaleDateString() : '—'}</small>
                    </td>
                    <td>
                      {r.status === 'PENDING' ? (
                        <div className="d-flex gap-1">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => setModal({ request: r, action: 'approve' })}
                            aria-label={`Approve request from ${r.employeeName}`}
                          >
                            ✅ Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => setModal({ request: r, action: 'reject' })}
                            aria-label={`Reject request from ${r.employeeName}`}
                          >
                            ❌ Reject
                          </Button>
                        </div>
                      ) : (
                        <small className="text-muted">
                          {r.managerNotes || r.adminNotes || '—'}
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>

        {data?.totalPages > 1 && (
          <Card.Footer className="d-flex justify-content-between align-items-center bg-white">
            <small className="text-muted" aria-live="polite">
              {page * 20 + 1}–{Math.min((page + 1) * 20, total)} of {total.toLocaleString()}
            </small>
            <div className="d-flex gap-2">
              <Button size="sm" variant="outline-secondary" disabled={data.first} onClick={() => setPage(p => p - 1)}>← Prev</Button>
              <span className="px-2 py-1 small text-muted">Page {page + 1} / {data.totalPages}</span>
              <Button size="sm" variant="outline-secondary" disabled={data.last}  onClick={() => setPage(p => p + 1)}>Next →</Button>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Approve / Reject modal */}
      {modal && (
        <ActionModal
          request={modal.request}
          action={modal.action}
          onClose={() => setModal(null)}
          onConfirm={handleConfirm}
          isPending={isMutating}
        />
      )}
    </Container>
  );
}
