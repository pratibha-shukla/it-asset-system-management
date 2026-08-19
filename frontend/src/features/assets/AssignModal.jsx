import { useState, useEffect } from 'react';
import { Modal, Form, Button, Spinner } from 'react-bootstrap';

/**
 * AssignModal — lets an admin assign an available asset to a user by User ID.
 *
 * Props:
 *   show      - boolean visibility flag
 *   asset     - Asset object being assigned (null = hidden)
 *   onHide    - close callback
 *   onAssign  - (assetId, userId) => void
 *   assigning - boolean, disables submit while mutation is running
 */
function AssignModal({ show, asset, onHide, onAssign, assigning }) {
  const [userId, setUserId] = useState('');

  // Reset user ID field whenever the modal opens
  useEffect(() => {
    if (show) setUserId('');
  }, [show]);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Assign: {asset?.name}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form.Label className="fw-semibold">User ID</Form.Label>
        <Form.Control
          type="number"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          placeholder="Enter numeric user ID"
          aria-label="User ID to assign asset to"
        />
        <Form.Text className="text-muted">
          Find the user ID on the Users page.
        </Form.Text>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!userId || assigning}
          onClick={() => onAssign(asset.id, Number(userId))}
        >
          {assigning ? <Spinner size="sm" /> : 'Assign'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default AssignModal;
