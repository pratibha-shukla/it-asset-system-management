import { useSelector, useDispatch } from 'react-redux';
import { removeNotification } from '../store/notificationSlice';
import { useEffect } from 'react';
import './NotificationBanner.css';

export default function NotificationBanner() {
  const notifications = useSelector(s => s.notifications?.items || []);
  const dispatch = useDispatch();

  useEffect(() => {
    notifications.forEach(n => {
      const timer = setTimeout(() => dispatch(removeNotification(n.id)), 5000);
      return () => clearTimeout(timer);
    });
  }, [notifications, dispatch]);

  return (
    /*
     * WCAG 4.1.3 / 1.3.3:
     *   aria-live="polite" announces new notifications to screen readers without
     *   interrupting current speech. role="log" implies polite live region + keeps history.
     */
    <div
      role="log"
      aria-live="polite"
      aria-label="System notifications"
      className="notification-container"
    >
      {notifications.map(n => (
        <div
          key={n.id}
          role="alert"
          className={`notification-item notification-item--${n.type || 'info'}`}
        >
          {/* aria-hidden on bell emoji — decorative */}
          <span><span aria-hidden="true">🔔 </span>{n.message}</span>
          <button
            onClick={() => dispatch(removeNotification(n.id))}
            aria-label={`Dismiss notification: ${n.message}`}
            className="notification-dismiss"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ))}
    </div>
  );
}
