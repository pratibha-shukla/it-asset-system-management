/**
 * axiosInstance.js — Maintenance Microfrontend (port 5074)
 *
 * SAME gateway URL as Asset MFE — both point to localhost:8080.
 * Only the API path differs (/maintenance/* vs /assets/*).
 */
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080/api/v1',  // same gateway, different paths
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
