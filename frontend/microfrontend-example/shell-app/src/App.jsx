/**
 * App.jsx — Shell Application (localhost:3000)
 *
 * The Shell is the host. It:
 *  1. Handles login/logout — broadcasts to all MFEs
 *  2. Loads each microfrontend inside an <iframe> OR via Module Federation
 *  3. Shows global notifications from any MFE
 *
 * IFRAME approach (simplest):
 *   Each MFE runs independently on its own port.
 *   Shell embeds them in iframes — complete isolation.
 *
 * Module Federation approach (advanced):
 *   Shell imports components directly from other apps at runtime.
 *   Shared dependencies (React, etc.) are loaded once.
 */
import { useEffect, useState } from 'react';
import eventBus, { EVENTS } from './eventBus';

export default function App() {
  const [notification, setNotification] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Listen for notifications from ANY microfrontend
    const unsubNotif = eventBus.on(EVENTS.NOTIFICATION, ({ message, type }) => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
    });

    return () => { unsubNotif(); };
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    // Broadcast to ALL microfrontends that user logged in
    eventBus.emit(EVENTS.USER_LOGGED_IN, userData);
  };

  const handleLogout = () => {
    setUser(null);
    eventBus.emit(EVENTS.USER_LOGGED_OUT, {});
  };

  return (
    <div>
      {/* Global notification bar — receives events from any MFE */}
      {notification && (
        <div className={`notification notification--${notification.type}`}>
          {notification.message}
        </div>
      )}

      <header>
        <h1>IT Asset Manager</h1>
        {user && <button onClick={handleLogout}>Logout</button>}
      </header>

      <main style={{ display: 'flex', gap: '16px' }}>
        {/*
          OPTION A — iframes (simple, full isolation)
          Each MFE is a completely separate React app on its own port.
          They communicate only via window CustomEvents.
        */}
        <iframe
          src="http://localhost:5073"   // Asset MFE
          title="Asset Management"
          style={{ width: '50%', height: '80vh', border: 'none' }}
        />
        <iframe
          src="http://localhost:5074"   // Maintenance MFE
          title="Maintenance"
          style={{ width: '50%', height: '80vh', border: 'none' }}
        />

        {/*
          OPTION B — Module Federation (advanced, shared React)
          import AssetApp from 'assetApp/App';      // loaded from :5073 at runtime
          import MaintenanceApp from 'mainApp/App'; // loaded from :5074 at runtime
          <AssetApp user={user} />
          <MaintenanceApp user={user} />
        */}
      </main>
    </div>
  );
}
