import {
  isValidName,
  isValidEmail,
  isValidPassword,
  isValidPhone,
  VALIDATION_MESSAGES as VM,
} from '../../utils/validators';

/**
 * validateNewUser — validates the Add User form.
 * Returns an errors object { [field]: message }.
 * Empty object means validation passed.
 */
export function validateNewUser(form) {
  const errors = {};

  if (!form.name?.trim())           errors.name     = 'Name is required';
  else if (!isValidName(form.name)) errors.name     = VM.name;

  if (!form.email?.trim())              errors.email = 'Email is required';
  else if (!isValidEmail(form.email))   errors.email = VM.email;

  if (!form.password?.trim())                 errors.password = 'Password is required';
  else if (!isValidPassword(form.password))   errors.password = VM.password;

  if (form.phoneNumber && !isValidPhone(form.phoneNumber))
    errors.phoneNumber = VM.phone;

  return errors;
}

/**
 * validateEditUser — validates the Edit User form.
 * Only validates fields that are actually editable in the edit modal.
 */
export function validateEditUser(form) {
  const errors = {};

  if (form.phoneNumber && !isValidPhone(form.phoneNumber))
    errors.phoneNumber = VM.phone;

  return errors;
}
