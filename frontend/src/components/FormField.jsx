import { Form } from 'react-bootstrap';

/**
 * FormField — generic form field wrapper (Form.Group based).
 *
 * Renders a label, the child input/select, and an inline validation error.
 * Use this inside a modal or form where you do NOT need a Col layout wrapper.
 * For Col-layout forms (e.g. asset grids), use AssetField instead.
 *
 * Props:
 *   k        - key name used to look up the error in `errs`
 *   label    - label text
 *   required - shows a red asterisk when true
 *   errs     - validation errors object { [k]: message }
 *   children - the actual input element
 */
function FormField({ k, label, required, errs = {}, children }) {
  return (
    <Form.Group>
      <Form.Label className="fw-semibold">
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </Form.Label>
      {children}
      {errs[k] && (
        <div className="text-danger field-error">⚠ {errs[k]}</div>
      )}
    </Form.Group>
  );
}

export default FormField;
