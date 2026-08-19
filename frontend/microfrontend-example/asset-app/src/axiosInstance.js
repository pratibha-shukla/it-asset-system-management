/**
 * axiosInstance.js — Asset Microfrontend (port 5073)
 *
 * ALL microfrontends point to the SAME API Gateway (port 8080).
 * The gateway decides which microservice to call.
 * Microfrontends NEVER call microservices directly.
 *
 *  Asset MFE (5073)  ──┐
 *  Maint MFE (5074)  ──┤──► API Gateway (8080) ──► Asset Service (8081)
 *  User  MFE (5075)  ──┘                       ──► Maint Service (8082)
 *                                               ──► User  Service (8083)
 */
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080/api/v1',  // always the gateway
  withCredentials: true,                    // send httpOnly cookie
});

// Attach JWT from cookie automatically (gateway validates it)
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Tell shell app to redirect to login
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
