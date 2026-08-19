import { useEffect } from 'react';

const APP_NAME = 'IT Asset Manager';

/**
 * WCAG 2.4.2 — Page Titled
 * Sets document.title dynamically per page so screen-reader users know where they are.
 * @param {string} title  Page-specific title, e.g. "Asset Inventory"
 */
export function usePageTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;
    return () => { document.title = prev; };
  }, [title]);
}
