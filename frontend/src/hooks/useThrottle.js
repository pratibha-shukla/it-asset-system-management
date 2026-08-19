import { useRef, useCallback, useState, useEffect } from 'react';

/**
 * Throttles a callback — fires at most once per `delay` ms.
 * Use on scroll handlers, resize events, button clicks.
 *
 * Usage:
 *   const handleScroll = useThrottle(({ scrollOffset }) => { ... }, 100);
 */
export function useThrottle(fn, delay = 200) {
  const lastCallRef = useRef(0);

  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      return fn(...args);
    }
  }, [fn, delay]);
}

/**
 * Throttles a value — updates at most once per `delay` ms.
 * Use for scroll position tracking, live counters, etc.
 *
 * Usage:
 *   const throttledCount = useThrottledValue(liveCount, 500);
 */
export function useThrottledValue(value, delay = 200) {
  const [throttled, setThrottled] = useState(value);
  const lastUpdate = useRef(0);

  useEffect(() => {
    const now = Date.now();
    const remaining = delay - (now - lastUpdate.current);
    if (remaining <= 0) {
      lastUpdate.current = now;
      setThrottled(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdate.current = Date.now();
        setThrottled(value);
      }, remaining);
      return () => clearTimeout(timer);
    }
  }, [value, delay]);

  return throttled;
}
