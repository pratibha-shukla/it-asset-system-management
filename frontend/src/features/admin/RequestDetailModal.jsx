import { useState, Fragment } from 'react';
import './RequestDetailModal.css';
import { Modal, Row, Col, Form, Button, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';

/**
 * RequestDetailModal — shows full request details for an admin.
 * Admin can approve or reject from this modal with optional notes.
 *
 * Props:
 *   req        - request object (null = hidden)
 *   show       - boolean visibility flag
 *   onHide     - close callback
 *   onApprove  - (id, notes) => void
 *   onReject   - (id, notes) => void
 *   processing - boolean, disables buttons while a mutation is in flight
 */
function RequestDetailModal({ req, show, onHide, onApprove, onReject, processing }) {
  const [notes, setNotes] = useState('');
  const notesId = 'admin-notes-textarea';

  if (!req) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered aria-labelledby="req-modal-title">
      <Modal.Header closeButton>
        <Modal.Title id="req-modal-title">
          Request #{req.id} — {req.productName}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Row className="g-3">
          {/* Employee details */}
          <Col md={6}>
            <section aria-label="Employee details" className="border rounded p-3 h-100">
              <h3 className="fw-bold text-muted mb-3 fs-6">
                <span aria-hidden="true">👤 </span>Employee Details
              </h3>
              <dl className="detail-grid">
                {[
                  ['Name',       req.employeeName || req.user?.name || '—'],
                  ['Email',      req.user?.email  || '—'],
                  ['Department', req.department   || '—'],
                  ['Phone',      req.phoneNumber  || '—'],
                  ['Branch',     req.user?.branchName || '—'],
                ].map(([k, v]) => (
                  <Fragment key={k}>
                    <dt className="text-muted detail-grid dt">{k}</dt>
                    <dd className="fw-semibold mb-1 detail-grid dd">{v}</dd>
                  </Fragment>
                ))}
              </dl>
            </section>
          </Col>

          {/* Request details */}
          <Col md={6}>
            <section aria-label="Request details" className="border rounded p-3 h-100">
              <h3 className="fw-bold text-muted mb-3 fs-6">
                <span aria-hidden="true">📋 </span>Request Details
              </h3>
              <dl className="detail-grid">
                {[
                  ['Product',   req.productName],
                  ['Quantity',  req.quantity || 1],
                  ['Project',   req.projectName || '—'],
                  ['Needed By', req.neededBy    || '—'],
                  ['Submitted', req.requestDate ? new Date(req.requestDate).toLocaleDateString() : '—'],
                ].map(([k, v]) => (
                  <Fragment key={k}>
                    <dt className="text-muted detail-grid dt">{k}</dt>
                    <dd className="fw-semibold mb-1 detail-grid dd">{v}</dd>
                  </Fragment>
                ))}
                <dt className="text-muted detail-grid dt">Priority</dt>
                <dd className="mb-1">
                  <Badge bg={req.priority === 'HIGH' ? 'danger' : req.priority === 'MEDIUM' ? 'warning' : 'success'}>
                    {req.priority}
                  </Badge>
                </dd>
              </dl>
            </section>
          </Col>

          {/* Justification */}
          <Col md={12}>
            <section aria-label="Business justification" className="border rounded p-3">
              <h3 className="fw-bold text-muted mb-2 fs-6">
                <span aria-hidden="true">💬 </span>Business Justification
              </h3>
              <p className="mb-0 pre-wrap">{req.justification}</p>
            </section>
          </Col>

          {/* Admin notes */}
          <Col md={12}>
            <Form.Label htmlFor={notesId} className="fw-semibold">
              Admin Notes
              <span className="text-muted fw-normal ms-1">
                (required for rejection, optional for approval)
              </span>
            </Form.Label>
            <Form.Control
              id={notesId}
              as="textarea"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes for the employee…"
              aria-describedby="notes-hint"
            />
            <Form.Text id="notes-hint" className="text-muted">
              The employee will see these notes after a decision is made.
            </Form.Text>
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
        <Button
          variant="danger"
          disabled={!notes.trim() || processing}
          onClick={() => {
            if (!notes.trim()) { toast.warn('Add a rejection reason'); return; }
            onReject(req.id, notes);
          }}
          aria-label={`Reject request for ${req.productName}`}
        >
          <span aria-hidden="true">✗ </span>Reject
        </Button>
        <Button
          variant="success"
          disabled={processing}
          onClick={() => onApprove(req.id, notes || 'Approved')}
          aria-label={`Approve request for ${req.productName}`}
          aria-busy={processing}
        >
          <span aria-hidden="true">✓ </span>Approve
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default RequestDetailModal;
