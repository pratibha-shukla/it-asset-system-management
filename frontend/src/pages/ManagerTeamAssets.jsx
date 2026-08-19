import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Container, Card, Table, Badge, Spinner, Form, Row, Col, InputGroup, Button } from 'react-bootstrap';
import { managerApi } from '../api/requestApi';
import { queryKeys }  from '../api/queryKeys';
import { usePageTitle } from '../hooks/usePageTitle';

const STATUS_VARIANT = {
  AVAILABLE:   'success',
  ASSIGNED:    'primary',
  MAINTENANCE: 'warning',
  RETIRED:     'secondary',
};

export default function ManagerTeamAssets() {
  usePageTitle('Team Assets');

  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(0);

  const params = { page, size: 20, search: search || undefined };

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.manager.teamAssets(params),
    queryFn:  () => managerApi.getTeamAssets(params),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const assets = data?.content       || [];
  const total  = data?.totalElements || 0;

  return (
    <Container fluid as="main" id="main-content" className="py-4 px-4">

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fw-bold mb-0 fs-4">🖥️ Team Assets</h1>
          <small className="text-muted" aria-live="polite">
            {total.toLocaleString()} asset{total !== 1 ? 's' : ''} assigned to your team members
          </small>
        </div>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Body className="py-3">
          <Row className="g-2 align-items-end">
            <Col md={4}>
              <Form.Label className="small fw-semibold mb-1">Search asset / employee</Form.Label>
              <InputGroup>
                <InputGroup.Text>🔍</InputGroup.Text>
                <Form.Control
                  placeholder="Asset name, serial, employee…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                />
                {search && (
                  <Button variant="outline-secondary" onClick={() => { setSearch(''); setPage(0); }}>✕</Button>
                )}
              </InputGroup>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {isLoading ? (
            <div className="text-center py-5" role="status">
              <Spinner variant="primary" />
              <div className="mt-2 text-muted">Loading team assets…</div>
            </div>
          ) : isError ? (
            <div className="alert alert-danger m-3">Failed to load team assets.</div>
          ) : assets.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <div style={{ fontSize: '2.5rem' }}>🖥️</div>
              <p>No assets assigned to your team members yet.</p>
            </div>
          ) : (
            <Table hover responsive className="mb-0" aria-label="Team assigned assets">
              <thead className="table-dark">
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Asset</th>
                  <th scope="col">Type</th>
                  <th scope="col">Serial</th>
                  <th scope="col">Assigned To</th>
                  <th scope="col">Status</th>
                  <th scope="col">Warranty</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id}>
                    <td><small className="text-muted">#{a.id}</small></td>
                    <td>
                      <div className="fw-semibold">{a.name}</div>
                      <small className="text-muted">{a.description?.slice(0, 50)}</small>
                    </td>
                    <td><small>{a.type}</small></td>
                    <td><code style={{ fontSize: 11 }}>{a.serialNumber || '—'}</code></td>
                    <td>
                      <div className="fw-semibold">{a.assignedToName || '—'}</div>
                      <small className="text-muted">{a.assignedToEmail || ''}</small>
                    </td>
                    <td>
                      <Badge bg={STATUS_VARIANT[a.status] || 'secondary'}>
                        {a.status}
                      </Badge>
                    </td>
                    <td>
                      <small className={
                        !a.warrantyExpiry ? 'text-muted' :
                        new Date(a.warrantyExpiry) < new Date() ? 'text-danger' : 'text-success'
                      }>
                        {a.warrantyExpiry
                          ? new Date(a.warrantyExpiry).toLocaleDateString()
                          : '—'}
                      </small>
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
    </Container>
  );
}
