import { Col, Form } from 'react-bootstrap';

/**
 * Reusable form field wrapper for asset forms.
 * Renders a label, the child input/select, and an inline validation error.
 *
 * Props:
 *   field    - key name used to look up the error in `errs`
 *   label    - label text
 *   required - shows a red asterisk when true
 *   errs     - validation errors object { [field]: message }
 *   ...rest  - forwarded to Col (e.g. md={6})
 */
function AssetField({ field, label, required, errs = {}, children, ...rest }) {
  return (
    <Col {...rest}>
      <Form.Label className="fw-semibold">
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </Form.Label>
      {children}
      {errs[field] && (
        <div className="text-danger field-error">⚠ {errs[field]}</div>
      )}
    </Col>
  );
}

export default AssetField;
