import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary }   from 'react-error-boundary';
import { useAuth }          from './hooks/useAuth';
import { useAuthBootstrap } from './hooks/useAuthBootstrap';
import { useServerEvents }  from './hooks/useServerEvents';
import Navbar          from './components/Navbar';
import LoadingSkeleton from './components/LoadingSkeleton';

// Lazy-loaded widgets — not needed before first render
const ChatWidget = lazy(() => import('./components/ChatWidget'));

// Lazy-loaded pages — each becomes its own JS chunk (code splitting)
const Login            = lazy(() => import('./pages/Login'));
const Dashboard        = lazy(() => import('./pages/Dashboard'));
const AssetList        = lazy(() => import('./pages/AssetList'));
const RequestForm      = lazy(() => import('./pages/RequestForm'));
const MyRequests       = lazy(() => import('./pages/MyRequests'));
const AdminDashboard   = lazy(() => import('./pages/AdminDashboard'));
const BranchManagement = lazy(() => import('./pages/BranchManagement'));
const UserManagement   = lazy(() => import('./pages/UserManagement'));
const AuditLogs          = lazy(() => import('./pages/AuditLogs'));
const AssetLifecycle     = lazy(() => import('./pages/AssetLifecycle'));
const ManagerRequests    = lazy(() => import('./pages/ManagerRequests'));
const ManagerTeamAssets  = lazy(() => import('./pages/ManagerTeamAssets'));
const LandingPage        = lazy(() => import('./pages/LandingPage'));

function ProtectedRoute({ children, requireAdmin = false, requireManager = false }) {
  const { isAuthenticated, isAdmin, isManager } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireAdmin   && !isAdmin)              return <Navigate to="/dashboard" replace />;
  if (requireManager && !isManager && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function PageError({ error, resetErrorBoundary }) {
  return (
    <div className="container mt-5 text-center">
      <div className="alert alert-danger">
        <h5>Something went wrong</h5>
        <p className="text-muted">{error.message}</p>
        <button className="btn btn-outline-danger btn-sm" onClick={resetErrorBoundary}>Try Again</button>
      </div>
    </div>
  );
}

/**
 * Inner component — must be a child of Redux Provider so useServerEvents
 * can call useDispatch().  Persistent Telemetry Streams: the hook opens a
 * single SSE connection for the entire authenticated session; no polling needed.
 */
function AppInner() {
  const { isAuthenticated } = useAuth();
  const { isChecking } = useAuthBootstrap();  // asks the server "am I logged in" — cookie is invisible to JS
  useServerEvents();   // no-op when isAuthenticated === false

  // Brief gate while GET /auth/me resolves — otherwise ProtectedRoute would
  // redirect to /login on every fresh page load before the cookie check
  // finishes, even for an already-logged-in user.
  if (isChecking) return <LoadingSkeleton />;

  return (
    <>
      {isAuthenticated && <Navbar />}
      {isAuthenticated && <Suspense fallback={null}><ChatWidget /></Suspense>}
      <Suspense fallback={<LoadingSkeleton />}>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />

          <Route path="/dashboard"    element={<ProtectedRoute><ErrorBoundary FallbackComponent={PageError}><Dashboard /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/assets"       element={<ProtectedRoute><ErrorBoundary FallbackComponent={PageError}><AssetList /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/requests/new" element={<ProtectedRoute><ErrorBoundary FallbackComponent={PageError}><RequestForm /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/requests"     element={<ProtectedRoute><ErrorBoundary FallbackComponent={PageError}><MyRequests /></ErrorBoundary></ProtectedRoute>} />

          <Route path="/admin"            element={<ProtectedRoute requireAdmin><ErrorBoundary FallbackComponent={PageError}><AdminDashboard /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/admin/branches"   element={<ProtectedRoute requireAdmin><ErrorBoundary FallbackComponent={PageError}><BranchManagement /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/admin/users"      element={<ProtectedRoute requireAdmin><ErrorBoundary FallbackComponent={PageError}><UserManagement /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedRoute requireAdmin><ErrorBoundary FallbackComponent={PageError}><AuditLogs /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/admin/lifecycle"  element={<ProtectedRoute requireAdmin><ErrorBoundary FallbackComponent={PageError}><AssetLifecycle /></ErrorBoundary></ProtectedRoute>} />

          {/* Manager routes — MANAGER or ADMIN can access */}
          <Route path="/manager/requests" element={<ProtectedRoute requireManager><ErrorBoundary FallbackComponent={PageError}><ManagerRequests /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/manager/assets"   element={<ProtectedRoute requireManager><ErrorBoundary FallbackComponent={PageError}><ManagerTeamAssets /></ErrorBoundary></ProtectedRoute>} />

          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return <AppInner />;
}
