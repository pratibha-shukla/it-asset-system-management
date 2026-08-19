/**
 * Masks all but the last 4 characters of a phone number for display,
 * e.g. "+1-555-0123" -> "•••••••0123". Returns '—' for empty/invalid input.
 */
export function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '—';
  const trimmed = phone.trim();
  if (!trimmed) return '—';
  if (trimmed.length <= 4) return '•'.repeat(trimmed.length);
  return '•'.repeat(trimmed.length - 4) + trimmed.slice(-4);
}
