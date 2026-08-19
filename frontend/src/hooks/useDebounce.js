import { useState, useEffect } from 'react';

/**
 * Delays updating the returned value until the user stops changing `value`
 * for `delay` milliseconds. Prevents excessive API calls on every keystroke.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchInput, 300);
 *   // use debouncedSearch as the query parameter
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
