import { useState, useEffect } from 'react';
import { Modal, Row, Col, Form, Button, Spinner } from 'react-bootstrap';
import FormField from '../../components/FormField';
import { validateEditUser } from './userValidation';

/**
 * EditUserModal — admin form to update an existing user's profile.
 * Editable fields: employeeId, phoneNumber, role, branch.
 * Also contains a Reset Password section.
 *
 * Props:
 *   show           - boolean visibility flag
 *   onHide         - close callback
 *   onSave         - (formData) => void — called with changed field values
 *   onResetPassword- (userId, newPassword) => void
 *   saving         - boolean, disables buttons while mutation is running
 *   branches       - array of Branch objects
 *   user           - current User object being edited
 */
function EditUserModal({ show, onHide, onSave, onResetPassword, saving, branches, user }) {
  const [form, setForm] = useState({
    phoneNumber: '', employeeId: '', role: 'EMPLOYEE', branchId: '',
  });
  const [errs, setErrs] = useState({});
  const [newPwd, setNewPwd] = useState('');

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrs(e => ({ ...e, [k]: undefined }));
  };

  // Populate form from user prop whenever the modal opens
  useEffect(() => {
    if (show && user) {
      setForm({
        phoneNumber: user.phoneNumber || '',
        employeeId:  user.employeeId  || '',
        role:        user.role        || 'EMPLOYEE',
        branchId:    user.branchId    || '',
      });
      setErrs({});
      setNewPwd('');
    }
  }, [show, user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const v = validateEditUser(form);
    if (Object.keys(v).length) { setErrs(v); return; }
    onSave({
      phoneNumber: form.phoneNumber || null,
      employeeId:  form.employeeId  || null,
      role:        form.role,
      branchId:    form.branchId ? Number(form.branchId) : null,
    });
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>✏️ Edit User — {user?.name}</Modal.Title>
      </Modal.Header>

      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <FormField k="employeeId" label="Employee ID" errs={errs}>
                <Form.Control
                  value={form.employeeId}
                  onChange={e => set('employeeId', e.target.value)}
                  placeholder="EMP-001"
                />
              </FormField>
            </Col>

            <Col md={6}>
              <FormField k="phoneNumber" label="Phone" errs={errs}>
                <Form.Control
                  value={form.phoneNumber}
                  isInvalid={!!errs.phoneNumber}
                  onChange={e => set('phoneNumber', e.target.value)}
                  placeholder="+1-555-0123"
                />
              </FormField>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Role</Form.Label>
                <Form.Select value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Branch</Form.Label>
                <Form.Select value={form.branchId} onChange={e => set('branchId', e.target.value)}>
                  <option value="">— No Branch —</option>
                  {(branches || []).map(b => (
                    <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        {/* Reset Password section — separated visually from profile fields */}
        <div className="px-3 pb-3">
          <hr />
          <Form.Label className="fw-semibold">🔑 Reset Password</Form.Label>
          <div className="d-flex gap-2">
            <Form.Control
              type="password"
              placeholder="New password (min 6 chars)"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              aria-label="New password for this user"
            />
            <Button
              variant="outline-warning"
              type="button"
              disabled={newPwd.length < 6 || saving}
              onClick={() => onResetPassword(user.id, newPwd)}
            >
              Reset
            </Button>
          </div>
        </div>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving && <Spinner size="sm" className="me-1" />}
            Save Changes
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

export default EditUserModal;
