/**
 * maintenanceApi.js — Maintenance MFE API calls
 * All go through API Gateway → Maintenance Service (8082)
 */
import axiosInstance from './axiosInstance';

export const maintenanceApi = {
  getByAsset: (assetId) =>
    axiosInstance.get(`/maintenance`, { params: { assetId } }).then(r => r.data.data),
  create: (data) =>
    axiosInstance.post('/maintenance', data).then(r => r.data.data),
  complete: (id) =>
    axiosInstance.put(`/maintenance/${id}/complete`).then(r => r.data.data),
};
