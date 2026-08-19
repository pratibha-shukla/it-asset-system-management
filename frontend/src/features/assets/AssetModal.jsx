import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Row, Col, Form, Button, Spinner } from 'react-bootstrap';
import { adminApi } from '../../api/adminApi';
import AssetField from '../../components/AssetField';
import { validateAsset, EMPTY_ASSET_FORM } from './assetValidation';

const ASSET_TYPES = [
  'Laptop', 'Monitor', 'Desktop', 'Printer', 'Keyboard',
  'Mouse', 'Tablet', 'Server', 'Network Equipment', 'Other',
];

/**
 * AssetModal — Add or Edit an asset.
 *
 * Props:
 *   show    - boolean visibility flag
 *   onHide  - close callback
 *   initial - existing Asset object when editing; null/undefined for new
 *   onSave  - (formData) => void
 *   saving  - boolean, disables submit while mutation is running
 */
function AssetModal({ show, onHide, initial, onSave, saving }) {
  const [form, setForm] = useState(EMPTY_ASSET_FORM);
  const [errs, setErrs] = useState({});

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrs(e => ({ ...e, [k]: undefined }));
  };

  // Reset form when modal opens or switches between add/edit
  useEffect(() => {
    setForm(
      initial
        ? { ...EMPTY_ASSET_FORM, ...initial, branchId: initial.branchId || '' }
        : EMPTY_ASSET_FORM
    );
    setErrs({});
  }, [initial, show]);

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn:  adminApi.getBranches,
    staleTime: 5 * 60 * 1000,
  });
  const branchList = Array.isArray(branches) ? branches : branches?.content || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    const v = validateAsset(form);
    if (Object.keys(v).length) { setErrs(v); return; }
    onSave(form);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{initial?.id ? 'Edit Asset' : 'Add New Asset'}</Modal.Title>
      </Modal.Header>

      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row className="g-3">
            <AssetField field="name" label="Asset Name" required errs={errs} md={6}>
              <Form.Control
                value={form.name}
                isInvalid={!!errs.name}
                isValid={!errs.name && form.name.length >= 3}
                onChange={e => set('name', e.target.value)}
                placeholder="HP EliteBook 840 G10"
              />
            </AssetField>

            <Col md={6}>
              <Form.Label className="fw-semibold">
                Type <span className="text-danger">*</span>
              </Form.Label>
              <Form.Select value={form.type} onChange={e => set('type', e.target.value)}>
                {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
              </Form.Select>
            </Col>

            <AssetField field="manufacturer" label="Manufacturer" errs={errs} md={6}>
              <Form.Control
                value={form.manufacturer}
                isInvalid={!!errs.manufacturer}
                onChange={e => set('manufacturer', e.target.value)}
                placeholder="HP, Dell, Apple…"
              />
            </AssetField>

            <AssetField field="model" label="Model" errs={errs} md={6}>
              <Form.Control
                value={form.model}
                isInvalid={!!errs.model}
                onChange={e => set('model', e.target.value)}
                placeholder="EliteBook 840 G10"
              />
            </AssetField>

            <AssetField field="serialNumber" label="Serial Number" required errs={errs} md={6}>
              <Form.Control
                value={form.serialNumber}
                isInvalid={!!errs.serialNumber}
                isValid={!errs.serialNumber && form.serialNumber.length >= 3}
                onChange={e => set('serialNumber', e.target.value)}
                placeholder="HP-LAP-2026-001 (must be unique)"
              />
            </AssetField>

            <AssetField field="branchId" label="Branch" required errs={errs} md={6}>
              <Form.Select
                value={form.branchId}
                isInvalid={!!errs.branchId}
                onChange={e => set('branchId', Number(e.target.value))}
              >
                <option value="">— Select Branch —</option>
                {branchList.map(b => (
                  <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
                ))}
              </Form.Select>
            </AssetField>

            <Col md={6}>
              <Form.Label className="fw-semibold">Status</Form.Label>
              <Form.Select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="RETIRED">Retired</option>
              </Form.Select>
            </Col>

            <AssetField field="purchasePrice" label="Purchase Price ($)" errs={errs} md={6}>
              <Form.Control
                value={form.purchasePrice}
                isInvalid={!!errs.purchasePrice}
                onChange={e => set('purchasePrice', e.target.value)}
                placeholder="1299.99"
              />
            </AssetField>

            <Col md={6}>
              <Form.Label className="fw-semibold">Purchase Date</Form.Label>
              <Form.Control
                type="date"
                value={form.purchaseDate}
                onChange={e => set('purchaseDate', e.target.value)}
              />
            </Col>

            <Col md={6}>
              <Form.Label className="fw-semibold">Warranty Expiry</Form.Label>
              <Form.Control
                type="date"
                value={form.warrantyExpiry}
                onChange={e => set('warrantyExpiry', e.target.value)}
              />
            </Col>

            <Col md={12}>
              <Form.Label className="fw-semibold">Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Brief description…"
              />
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving && <Spinner size="sm" className="me-1" />}
            {initial?.id ? 'Save Changes' : 'Add Asset'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

export default AssetModal;
