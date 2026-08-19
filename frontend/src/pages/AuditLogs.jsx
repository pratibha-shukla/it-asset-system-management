import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Container, Card, Table, Badge, Button, Spinner, Form, Row, Col, InputGroup } from 'react-bootstrap';
import { adminApi }    from '../api/adminApi';
import { queryKeys }   from '../api/queryKeys';
import { usePageTitle } from '../hooks/usePageTitle';
import './AuditLogs.css';

const ACTION_TYPES = [
  'ALL',
  'CREATE', 'UPDATE', 'DELETE',
  'ASSIGN', 'UNASSIGN',
  'APPROVE', 'REJECT',
  'SCHEDULED_UNASSIGN',
  'LOGIN',
];

function ActionBadge({ action }) {
  const cls = `audit-action-badge audit-action--${
    ACTION_TYPES.includes(action) ? action : 'default'
  }`;
  return <span className={cls}>{action}</span>;
}

function PerformerBadge({ performer }) {
  if (!performer) return <span className="text-muted">—</span>;
  const isSystem = performer === 'SYSTEM_SCHEDULER' || performer.startsWith('SYSTEM');
  if (isSystem) return <span className="audit-performer--system">⚙ SCHEDULER</span>;
  return <span className="fw-semibold">{performer}</span>;
}

export default function AuditLogs() {
  usePageTitle('Audit Logs');

  const [page,        setPage]       = useState(0);
  const [action,      setAction]     = useState('');
  const [search,      setSearch]     = useState('');
  const [dateFrom,    setDateFrom]   = useState('');
  const [dateTo,      setDateTo]     = useState('');

  const params = {
    page,
    size: 20,
    action:   action   || undefined,
    search:   search   || undefined,
    dateFrom: dateFrom || undefined,
    dateTo:   dateTo   || undefined,
  };

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: queryKeys.admin.auditLogs(params),
    queryFn:  () => adminApi.getAuditLogs(params),
    staleTime: 30_000,
    placeholderData: prev => prev,
  });

  const logs  = data?.content        || [];
  const total = data?.totalElements  || 0;

  const handleReset = () => {
    setPage(0); setAction(''); setSearch(''); setDateFrom(''); setDateTo('');
  };

  return (
    <Container fluid as="main" id="main-content" className="py-4 px-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fw-bold mb-0 fs-4">📋 Audit Logs</h1>
          <small className="text-muted" aria-live="polite">
            {total.toLocaleString()} entries — includes nightly scheduler runs
          </small>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Body className="py-3">
          <Row className="g-2 align-items-end">
            <Col md={3}>
              <Form.Label className="small fw-semibold mb-1">Search asset / user</Form.Label>
              <InputGroup>
                <InputGroup.Text>🔍</InputGroup.Text>
                <Form.Control
                  placeholder="Asset name, serial, user…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                />
                {search && (
                  <Button variant="outline-secondary" onClick={() => { setSearch(''); setPage(0); }}>✕</Button>
                )}
              </InputGroup>
            </Col>

            <Col md={2}>
              <Form.Label className="small fw-semibold mb-1">Action</Form.Label>
              <Form.Select value={action} onChange={e => { setAction(e.target.value); setPage(0); }}>
                {ACTION_TYPES.map(a => (
                  <option key={a} value={a === 'ALL' ? '' : a}>{a}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label className="small fw-semibold mb-1">From date</Form.Label>
              <Form.Control
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(0); }}
              />
            </Col>

            <Col md={2}>
              <Form.Label className="small fw-semibold mb-1">To date</Form.Label>
              <Form.Control
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(0); }}
              />
            </Col>

            <Col md={2}>
              <Button variant="outline-secondary" onClick={handleReset} className="w-100">
                Reset Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Scheduler info banner */}
      <div className="alert alert-dark d-flex align-items-center gap-2 py-2 mb-3" role="note">
        <span>⚙</span>
        <small>
          <strong>SCHEDULER</strong> entries are created automatically each night at 2:00 AM —
          they show assets auto-released from terminated employees.
        </small>
      </div>

      {/* Log table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {isLoading ? (
            <div className="text-center py-5" role="status">
              <Spinner variant="primary" />
              <div className="mt-2 text-muted">Loading audit logs…</div>
            </div>
          ) : isError ? (
            <div className="alert alert-danger m-3">Failed to load audit logs.</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <div style={{ fontSize: '2.5rem' }}>📋</div>
              <p>No audit log entries found.</p>
            </div>
          ) : (
            <Table hover responsive className="mb-0" aria-label="Audit log entries">
              <thead className="table-dark">
                <tr>
                  <th scope="col" style={{ width: 55 }}>#</th>
                  <th scope="col" style={{ width: 170 }}>Timestamp</th>
                  <th scope="col" style={{ width: 160 }}>Action</th>
                  <th scope="col">Asset</th>
                  <th scope="col">Performed By</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td><small className="text-muted">#{log.id}</small></td>
                    <td>
                      <div className="small">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })
                          : '—'}
                      </div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                            })
                          : ''}
                      </div>
                    </td>
                    <td><ActionBadge action={log.action} /></td>
                    <td>
                      {log.assetName
                        ? <><div className="fw-semibold">{log.assetName}</div>
                            <small className="text-muted font-monospace">{log.assetSerialNumber || ''}</small></>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td><PerformerBadge performer={log.performedBy} /></td>
                    <td>
                      <span className="audit-details" title={log.details}>
                        {log.details || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>

        {/* Pagination */}
        {data?.totalPages > 1 && (
          <Card.Footer className="d-flex justify-content-between align-items-center bg-white">
            <small className="text-muted">
              {page * 20 + 1}–{Math.min((page + 1) * 20, total)} of {total.toLocaleString()}
              {isFetching && <Spinner size="sm" className="ms-2" />}
            </small>
            <div className="d-flex gap-2">
              <Button size="sm" variant="outline-secondary" disabled={data.first} onClick={() => setPage(p => p - 1)}>← Prev</Button>
              <span className="px-2 py-1 small text-muted">Page {page + 1} / {data.totalPages}</span>
              <Button size="sm" variant="outline-secondary" disabled={data.last}  onClick={() => setPage(p => p + 1)}>Next →</Button>
            </div>
          </Card.Footer>
        )}
      </Card>
    </Container>
  );
}
