import { useState } from 'react';
import { Modal, Form, Button, Spinner } from 'react-bootstrap';

/**
 * FulfillModal — lets admin pick an available asset and assign it to fulfill
 * an approved request.
 *
 * Props:
 *   req             - approved request object (null = hidden)
 *   onHide          - close callback
 *   onConfirm       - (requestId, assetId) => void
 *   isPending       - boolean, disables Confirm button while mutation is running
 *   availableAssets - array of available Asset objects
 */
function FulfillModal({ req, onHide, onConfirm, isPending, availableAssets }) {
  const [assetId, setAssetId] = useState('');

  if (!req) return null;

  return (
    <Modal show onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>📦 Assign Asset — {req.productName}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p className="text-muted mb-3">
          Employee: <strong>{req.employeeName || req.user?.name}</strong>
        </p>

        <Form.Group>
          <Form.Label className="fw-semibold">
            Select Available Asset <span className="text-danger">*</span>
          </Form.Label>
          <Form.Select value={assetId} onChange={e => setAssetId(e.target.value)}>
            <option value="">— Choose an asset —</option>
            {(availableAssets || []).map(a => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.serialNumber} · {a.location || 'No location'} · ${a.purchasePrice?.toLocaleString() || '—'}
              </option>
            ))}
          </Form.Select>
          {availableAssets?.length === 0 && (
            <div className="text-danger small mt-1">⚠ No available assets in inventory.</div>
          )}
        </Form.Group>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!assetId || isPending}
          onClick={() => onConfirm(req.id, Number(assetId))}
        >
          {isPending && <Spinner size="sm" className="me-1" />}
          Assign &amp; Fulfill
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default FulfillModal;
