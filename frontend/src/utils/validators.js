// ─────────────────────────────────────────────────────────────
//  validators.js  –  Reusable regex validators for all forms
// ─────────────────────────────────────────────────────────────

const REGEX = {
  name:          /^[a-zA-Z\s'\-]{2,80}$/,
  email:         /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  password:      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  phone:         /^(\+?[\d\s\-(). ]{7,20}|[Ee]xt\.?\s*\d{1,6})$/,
  productName:   /^[a-zA-Z0-9\s\-_.,()&/]{3,200}$/,
  justification: /^[\w\s.,!?;:()\-'"/]{10,1000}$/,
  projectName:   /^[a-zA-Z0-9\s\-_.]{2,100}$/,
  serialNumber:  /^[A-Za-z0-9\-_.]{3,50}$/,
  manufacturer:  /^[a-zA-Z0-9\s\-&.]{2,50}$/,
  model:         /^[a-zA-Z0-9\s\-_.]{1,50}$/,
  price:         /^\d{1,8}(\.\d{1,2})?$/,
};

export const isValidName         = (v) => REGEX.name.test(v);
export const isValidEmail        = (v) => REGEX.email.test(v);
export const isValidPassword     = (v) => REGEX.password.test(v);
export const isValidPhone        = (v) => !v || v.trim() === '' || REGEX.phone.test(v);
export const isValidProductName  = (v) => REGEX.productName.test(v);
export const isValidJustification= (v) => REGEX.justification.test(v);
export const isValidProjectName  = (v) => !v || v.trim() === '' || REGEX.projectName.test(v);
export const isValidSerialNumber = (v) => REGEX.serialNumber.test(v);
export const isValidManufacturer = (v) => !v || v.trim() === '' || REGEX.manufacturer.test(v);
export const isValidModel        = (v) => !v || v.trim() === '' || REGEX.model.test(v);
export const isValidPrice        = (v) => !v || v.toString().trim() === '' || REGEX.price.test(String(v));

// Error messages matched to each validator
export const VALIDATION_MESSAGES = {
  name:          'Name must be 2–80 letters, spaces, hyphens or apostrophes only',
  email:         'Enter a valid email address (e.g. user@company.com)',
  password:      'Password must be 8+ chars with uppercase, lowercase, and a number',
  phone:         'Enter a valid phone number (e.g. +1-555-0123 or ext. 4521)',
  productName:   'Only letters, numbers, spaces and - _ . , ( ) & / allowed (3–200 chars)',
  justification: 'No special characters like < > { } [ ] allowed (10–1000 chars)',
  projectName:   'Only letters, numbers, spaces and - _ . allowed (2–100 chars)',
  serialNumber:  'Only letters, numbers, - _ . allowed (3–50 chars)',
  manufacturer:  'Only letters, numbers, spaces and - & . allowed (2–50 chars)',
  model:         'Only letters, numbers, spaces and - _ . allowed (1–50 chars)',
  price:         'Enter a valid price (e.g. 1299.99)',
};
