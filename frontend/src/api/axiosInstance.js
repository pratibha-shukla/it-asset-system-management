import axios from 'axios';
import axiosRetry from 'axios-retry';

// When VITE_API_BASE_URL is unset, default to a RELATIVE path so requests go
// through Vite's dev-server proxy (see vite.config.js) and are same-origin
// from the browser's point of view — required for the httpOnly auth cookies
// (SameSite=Lax) to be sent/received without cross-site restrictions. Only set
// VITE_API_BASE_URL to an absolute URL for a deployment where the frontend and
// API are intentionally served from different origins (needs SameSite=None +
// HTTPS on the backend in that case).
const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1';

const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  // The JWT now lives in an httpOnly cookie — this makes the browser send it
  // (and the CSRF double-submit cookie) automatically on every request.
  withCredentials: true,
});

axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkError(error) ||
    (error.response?.status >= 500 && error.response?.status < 600),
});

// Handle 401 — try refresh (cookie-based, no token to pass), then force logout
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;
      try {
        // Bare axios (not axiosInstance) — avoids recursing back through this
        // same response interceptor if the refresh call itself ever 401s.
        await axios.post(`${API_BASE}/auth/refresh`, null, { withCredentials: true });
        return axiosInstance(originalRequest);
      } catch {
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
