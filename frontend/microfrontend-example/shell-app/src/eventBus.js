/**
 * eventBus.js — Shared communication layer between microfrontends.
 *
 * Each microfrontend imports this and uses it to send/receive events
 * WITHOUT knowing about each other directly.
 *
 * Pattern: Pub/Sub via browser CustomEvent on window.
 */
const eventBus = {
  emit(event, detail) {
    window.dispatchEvent(new CustomEvent(event, { detail }));
  },
  on(event, callback) {
    const handler = (e) => callback(e.detail);
    window.addEventListener(event, handler);
    return () => window.removeEventListener(event, handler); // cleanup
  },
};

export default eventBus;

// Event names agreed across ALL microfrontends
export const EVENTS = {
  ASSET_SELECTED:      'asset:selected',       // Asset MFE → Maintenance MFE
  MAINTENANCE_CREATED: 'maintenance:created',  // Maintenance MFE → Asset MFE
  USER_LOGGED_IN:      'auth:login',           // Shell → all MFEs
  USER_LOGGED_OUT:     'auth:logout',          // Shell → all MFEs
  NOTIFICATION:        'app:notification',     // any MFE → Shell (shows toast)
};
