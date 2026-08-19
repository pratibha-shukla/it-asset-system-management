import {
  isValidProductName,
  isValidSerialNumber,
  isValidManufacturer,
  isValidModel,
  isValidPrice,
  VALIDATION_MESSAGES as VM,
} from '../../utils/validators';

/**
 * validateAsset — validates the Add/Edit Asset form.
 * Returns an errors object { [field]: message }.
 * Empty object means validation passed.
 */
export function validateAsset(form) {
  const errors = {};

  if (!form.name?.trim())                   errors.name          = 'Asset name is required';
  else if (!isValidProductName(form.name))  errors.name          = VM.productName;

  if (!form.serialNumber?.trim())                     errors.serialNumber = 'Serial number is required';
  else if (!isValidSerialNumber(form.serialNumber))   errors.serialNumber = VM.serialNumber;

  if (!isValidManufacturer(form.manufacturer)) errors.manufacturer = VM.manufacturer;
  if (!isValidModel(form.model))               errors.model        = VM.model;
  if (!isValidPrice(form.purchasePrice))       errors.purchasePrice= VM.price;
  if (!form.branchId)                          errors.branchId     = 'Branch is required';

  return errors;
}

/** Default empty form state for a new asset */
export const EMPTY_ASSET_FORM = {
  name: '', type: 'Laptop', serialNumber: '', manufacturer: '',
  model: '', description: '', purchasePrice: '', purchaseDate: '',
  warrantyExpiry: '', status: 'AVAILABLE', branchId: '',
};
