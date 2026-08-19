import { useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth }     from './useAuth';
import { addNotification } from '../store/notificationSlice';
import { queryClient }     from '../queryClient';
import { queryKeys }       from '../api/queryKeys';

// Relative by default so this goes through Vite's dev-server proxy and stays
// same-origin — see the comment in axiosInstance.js for why that matters now
// that auth is cookie-based.
const SSE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/sse/subscribe`
  : '/api/v1/sse/subscribe';

/**
 * Persistent Telemetry Streams:
 *   Establishes a single SSE connection per authenticated session via the browser's
 *   native EventSource API.  Events received from Kafka (via Spring SseController)
 *   are dispatched to Redux for notification banners AND trigger targeted React Query
 *   cache invalidations — keeping the UI fresh without polling.
 *
 * Cross-Environment State Synchronization:
 *   Connection is deferred until authentication lifecycle is complete (isAuthenticated).
 *   On token expiry the hook cleans up the EventSource cleanly — no stale listeners.
 */
export function useServerEvents() {
  const dispatch        = useDispatch();
  const { isAuthenticated } = useAuth();
  const esRef           = useRef(null);
  const reconnectDelay  = useRef(1000);

  const connect = useCallback(() => {
    if (!isAuthenticated) return;
    if (esRef.current) esRef.current.close();

    // The httpOnly auth cookie travels automatically on same-origin requests —
    // withCredentials tells EventSource to include it (default is to omit
    // credentials on cross-origin-style requests).
    const es = new EventSource(SSE_URL, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      reconnectDelay.current = 1000;   // reset backoff on successful connect
    };

    // ── Domain event handlers ────────────────────────────────────────────

    const assetEvents = ['ASSET_CREATED','ASSET_UPDATED','ASSET_ASSIGNED','ASSET_UNASSIGNED','ASSET_DELETED'];
    assetEvents.forEach(type => {
      es.addEventListener(type, (e) => {
        dispatch(addNotification({ type: 'info', message: e.data }));
        // Invalidate asset cache so list refreshes automatically
        queryClient.invalidateQueries({ queryKey: queryKeys.assets.all() });
        if (type === 'ASSET_CREATED' || type === 'ASSET_DELETED') {
          queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() });
        }
      });
    });

    const requestEvents = ['REQUEST_SUBMITTED','REQUEST_APPROVED','REQUEST_REJECTED'];
    requestEvents.forEach(type => {
      es.addEventListener(type, (e) => {
        const notifType = type === 'REQUEST_APPROVED' ? 'success'
                        : type === 'REQUEST_REJECTED' ? 'error'
                        : 'info';
        dispatch(addNotification({ type: notifType, message: e.data }));
        queryClient.invalidateQueries({ queryKey: queryKeys.requests.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() });
      });
    });

    // Silently discard heartbeats
    es.addEventListener('heartbeat', () => {});

    es.onerror = () => {
      es.close();
      // Exponential back-off reconnect (max 30 s)
      setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30_000);
        connect();
      }, reconnectDelay.current);
    };
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    connect();
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [connect]);
}
