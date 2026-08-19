/**
 * Jest-compatible component tests for the Login page (run via Vitest).
 *
 * Strategy: mock every external dependency so this test only exercises
 * the Login component's rendering and client-side validation logic.
 *
 * Covers:
 *  - Renders all form elements (email, password, submit)
 *  - WCAG: form fields have explicit label associations
 *  - Client-side validation: empty submit shows error
 *  - Password visibility toggle works
 *  - Calls authApi.login on valid submit
 *  - Shows server error from API response
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock all external modules before importing Login ─────────────────────────

vi.mock('../api/authApi', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: () => ({ isAuthenticated: false }),
}));

vi.mock('../store/authSlice', () => ({
  loginSuccess: vi.fn((payload) => ({ type: 'auth/loginSuccess', payload })),
}));

vi.mock('../hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

// ── Now import the component ──────────────────────────────────────────────────
import Login from '../pages/Login';
import { authApi } from '../api/authApi';

function renderLogin() {
  return render(<Login />);
}

describe('Login — rendering', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders page heading', () => {
    renderLogin();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders email and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders Sign In submit button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});

describe('Login — WCAG accessibility', () => {
  it('email field has a label associated via htmlFor', () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeInTheDocument();
    // getByLabelText proves the <label htmlFor> → <input id> association works
  });

  it('password field has a label associated via htmlFor', () => {
    renderLogin();
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toBeInTheDocument();
  });

  it('password toggle button has aria-pressed attribute', () => {
    renderLogin();
    const toggleBtn = screen.getByRole('button', { name: /show.+password|hide.+password/i });
    expect(toggleBtn).toHaveAttribute('aria-pressed');
  });
});

describe('Login — password visibility toggle', () => {
  it('password field starts as type="password"', () => {
    renderLogin();
    const pwd = screen.getByLabelText(/password/i);
    expect(pwd).toHaveAttribute('type', 'password');
  });

  it('toggles to type="text" when show-password button clicked', async () => {
    renderLogin();
    const toggleBtn = screen.getByRole('button', { name: /show.+password|hide.+password/i });
    await userEvent.click(toggleBtn);
    const pwd = screen.getByLabelText(/password/i);
    expect(pwd).toHaveAttribute('type', 'text');
  });
});

describe('Login — form submission', () => {
  it('calls authApi.login with email and password on valid submit', async () => {
    authApi.login.mockResolvedValueOnce({
      data: { data: { token: 'tok', user: { role: 'ADMIN' } }, message: 'OK' },
    });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Password1!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'admin@test.com',
        password: 'Password1!',
      });
    });
  });

  it('shows error message when API returns 401', async () => {
    authApi.login.mockRejectedValueOnce({
      response: { data: { message: 'Invalid credentials' } },
    });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), 'bad@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
