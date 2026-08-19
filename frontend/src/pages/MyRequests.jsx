import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Container, Table, Badge, Spinner, Card, Form, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { requestApi }  from '../api/requestApi';
import { queryKeys }   from '../api/queryKeys';
import { usePageTitle } from '../hooks/usePageTitle';
import './MyRequests.css';

const STATUS_VARIANT = { PENDING:'warning', APPROVED:'success', REJECTED:'danger', FULFILLED:'primary' };

export default function MyRequests() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);

  usePageTitle('My Requests');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.requests.list({ status, page }),
    queryFn:  () => requestApi.getAll({ status: status || undefined, page, size: 20 }),
  });

  const requests = data?.content || [];

  return (
    <Container as="main" id="main-content" className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="fw-bold mb-0 fs-4">
          <span aria-hidden="true">📂 </span>My Requests
        </h1>
        <Link to="/requests/new" className="btn btn-primary btn-sm">+ New Request</Link>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white py-3">
          {/* WCAG 1.3.1: label must be associated with the select */}
          <Form.Label htmlFor="status-filter" className="sr-only">Filter by status</Form.Label>
          <Form.Select
            id="status-filter"
            aria-label="Filter requests by status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            className="status-filter"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Form.Select>
        </Card.Header>

        <Card.Body className="p-0">
          {isLoading
            ? <div className="text-center py-5" role="status" aria-label="Loading requests"><Spinner aria-hidden="true"/></div>
            : requests.length === 0
            ? <div className="text-center py-5 text-muted" role="status">No requests found.</div>
            : (
              <Table hover responsive className="mb-0" aria-label="My asset requests">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Status</th>
                    <th scope="col">Admin Notes</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="fw-semibold">{r.productName}</div>
                        <small className="text-muted">{r.justification?.slice(0, 60)}{r.justification?.length > 60 && '…'}</small>
                      </td>
                      <td>
                        <Badge bg={r.priority==='HIGH'?'danger':r.priority==='MEDIUM'?'warning':'success'}>
                          {r.priority}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={STATUS_VARIANT[r.status]}>
                          {r.status}
                        </Badge>
                      </td>
                      <td><small className="text-muted">{r.adminNotes || '—'}</small></td>
                      <td><small>{new Date(r.requestDate).toLocaleDateString()}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
        </Card.Body>

        {data?.totalPages > 1 && (
          <Card.Footer className="d-flex justify-content-between align-items-center bg-white">
            <Button
              size="sm" variant="outline-secondary"
              disabled={data.first}
              onClick={() => setPage(p => p - 1)}
              aria-label="Previous page"
            >
              ← Prev
            </Button>
            {/* aria-live: announces page changes to screen readers */}
            <small className="text-muted" aria-live="polite" aria-atomic="true">
              Page {page + 1} of {data.totalPages}
            </small>
            <Button
              size="sm" variant="outline-secondary"
              disabled={data.last}
              onClick={() => setPage(p => p + 1)}
              aria-label="Next page"
            >
              Next →
            </Button>
          </Card.Footer>
        )}
      </Card>
    </Container>
  );
}
