import { useState, useEffect } from 'react';
import {
  Modal, Row, Col, Form, Button, Spinner, InputGroup,
} from 'react-bootstrap';
import FormField from '../../components/FormField';
import { validateNewUser } from './userValidation';

const EMPTY_USER = {
  name: '', email: '', password: '', role: 'EMPLOYEE',
  branchId: '', phoneNumber: '', employeeId: '',
};

/**
 * AddUserModal — admin form to create a new user.
 *
 * Props:
 *   show     - boolean visibility flag
 *   onHide   - close callback
 *   onSave   - (formData) => void — called with validated form values
 *   saving   - boolean, disables submit button while mutation is running
 *   branches - array of Branch objects for the branch dropdown
 */
function AddUserModal({ show, onHide, onSave, saving, branches }) {
  const [form, setForm]     = useState(EMPTY_USER);
  const [errs, setErrs]     = useState({});
  const [showPwd, setShowPwd] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrs(e => ({ ...e, [k]: undefined }));
  };

  // Reset form whenever the modal opens
  useEffect(() => {
    if (show) { setForm(EMPTY_USER); setErrs({}); }
  }, [show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const v = validateNewUser(form);
    if (Object.keys(v).length) { setErrs(v); return; }
    onSave({ ...form, branchId: form.branchId ? Number(form.branchId) : null });
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>👤 Add New User</Modal.Title>
      </Modal.Header>

      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <FormField k="name" label="Full Name" required errs={errs}>
                <Form.Control
                  value={form.name}
                  isInvalid={!!errs.name}
                  isValid={!errs.name && form.name.length >= 2}
                  onChange={e => set('name', e.target.value)}
                  placeholder="John Smith"
                />
              </FormField>
            </Col>

            <Col md={6}>
              <FormField k="email" label="Email Address" required errs={errs}>
                <Form.Control
                  type="email"
                  value={form.email}
                  isInvalid={!!errs.email}
                  isValid={!errs.email && form.email.includes('@')}
                  onChange={e => set('email', e.target.value)}
                  placeholder="john@company.com"
                />
              </FormField>
            </Col>

            <Col md={6}>
              <FormField k="password" label="Password" required errs={errs}>
                <InputGroup>
                  <Form.Control
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    isInvalid={!!errs.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="Min 8 chars, upper+lower+digit"
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowPwd(p => !p)}
                    tabIndex={-1}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? '🙈' : '👁️'}
                  </Button>
                </InputGroup>
              </FormField>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  Role <span className="text-danger">*</span>
                </Form.Label>
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
                <Form.Label className="fw-semibold">Employee ID</Form.Label>
                <Form.Control
                  value={form.employeeId}
                  onChange={e => set('employeeId', e.target.value)}
                  placeholder="EMP-001"
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving && <Spinner size="sm" className="me-1" />}
            Add User
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

export default AddUserModal;
