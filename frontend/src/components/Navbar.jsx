import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, isAdmin, isManager, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [adminOpen,   setAdminOpen]   = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [userOpen,    setUserOpen]    = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  // WCAG 2.4.4: aria-current="page" marks the active route for screen readers
  const cur = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
      ? 'page' : undefined;

  return (
    <nav className="navbar navbar-dark navbar-expand-lg bg-dark px-3" aria-label="Main navigation">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/dashboard" aria-label="IT Asset Manager — home">
          <span aria-hidden="true">🖥️ </span>IT Asset Manager
        </Link>

        {/* WCAG 2.1.1: Toggle must be reachable by keyboard */}
        <button
          className="navbar-toggler"
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={`collapse navbar-collapse${menuOpen ? ' show' : ''}`}>
          {/* Left nav links */}
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link" to="/assets" aria-current={cur('/assets')}>Assets</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/requests" aria-current={location.pathname === '/requests' ? 'page' : undefined}>My Requests</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/requests/new" aria-current={cur('/requests/new')}>+ New Request</Link>
            </li>

            {isManager && (
              <li className="nav-item dropdown">
                <button
                  className="nav-link dropdown-toggle btn btn-link text-white"
                  id="manager-nav"
                  aria-expanded={managerOpen}
                  aria-label="Manager menu"
                  onClick={() => setManagerOpen(o => !o)}
                  type="button"
                >
                  <span aria-hidden="true">👥 </span>My Team
                </button>
                <ul className={`dropdown-menu dropdown-menu-dark${managerOpen ? ' show' : ''}`} aria-labelledby="manager-nav">
                  <li><Link className="dropdown-item" to="/manager/requests" aria-current={cur('/manager/requests')} onClick={() => setManagerOpen(false)}>📋 Team Requests</Link></li>
                  <li><Link className="dropdown-item" to="/manager/assets"   aria-current={cur('/manager/assets')}   onClick={() => setManagerOpen(false)}>🖥️ Team Assets</Link></li>
                </ul>
              </li>
            )}

            {isAdmin && (
              <li className="nav-item dropdown">
                <button
                  className="nav-link dropdown-toggle btn btn-link text-white"
                  id="admin-nav"
                  aria-expanded={adminOpen}
                  aria-label="Admin menu"
                  onClick={() => setAdminOpen(o => !o)}
                  type="button"
                >
                  <span aria-hidden="true">⚙️ </span>Admin
                </button>
                <ul className={`dropdown-menu dropdown-menu-dark${adminOpen ? ' show' : ''}`} aria-labelledby="admin-nav">
                  <li><Link className="dropdown-item" to="/admin"            aria-current={location.pathname === '/admin' ? 'page' : undefined} onClick={() => setAdminOpen(false)}>Dashboard</Link></li>
                  <li><Link className="dropdown-item" to="/admin/users"      aria-current={cur('/admin/users')}    onClick={() => setAdminOpen(false)}>Users</Link></li>
                  <li><Link className="dropdown-item" to="/admin/branches"   aria-current={cur('/admin/branches')} onClick={() => setAdminOpen(false)}>Branches</Link></li>
                  <li><Link className="dropdown-item" to="/admin/audit-logs" aria-current={cur('/admin/audit-logs')} onClick={() => setAdminOpen(false)}>Audit Logs</Link></li>
                  <li><Link className="dropdown-item" to="/admin/lifecycle"  aria-current={cur('/admin/lifecycle')}  onClick={() => setAdminOpen(false)}>📊 Lifecycle &amp; Finance</Link></li>
                </ul>
              </li>
            )}
          </ul>

          {/* Right — user menu */}
          <ul className="navbar-nav">
            <li className="nav-item dropdown">
              <button
                className="nav-link dropdown-toggle btn btn-link text-white"
                id="user-nav"
                aria-expanded={userOpen}
                aria-label="User account menu"
                onClick={() => setUserOpen(o => !o)}
                type="button"
              >
                <span aria-hidden="true">👤 </span>{user?.name || 'User'}
              </button>
              <ul className={`dropdown-menu dropdown-menu-dark dropdown-menu-end${userOpen ? ' show' : ''}`} aria-labelledby="user-nav">
                <li>
                  <span className="dropdown-item-text">
                    <span className="d-block small">{user?.email}</span>
                    <span className={`badge mt-1 ${isAdmin ? 'bg-danger' : isManager ? 'bg-warning text-dark' : 'bg-primary'}`}>{user?.role}</span>
                  </span>
                </li>
                <li><hr className="dropdown-divider"/></li>
                <li>
                  <button
                    className="dropdown-item text-danger"
                    onClick={() => { setUserOpen(false); handleLogout(); }}
                    aria-label="Log out of your account"
                    type="button"
                  >
                    <span aria-hidden="true">🚪 </span>Logout
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
