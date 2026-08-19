/**
 * assetApi.js — Asset Microfrontend API calls
 * All go through API Gateway → Asset Service (8081)
 */
import axiosInstance from './axiosInstance';

export const assetApi = {
  getAll:  (params) => axiosInstance.get('/assets', { params }).then(r => r.data.data),
  getById: (id)     => axiosInstance.get(`/assets/${id}`).then(r => r.data.data),
  create:  (data)   => axiosInstance.post('/assets', data).then(r => r.data.data),
  update:  (id, d)  => axiosInstance.put(`/assets/${id}`, d).then(r => r.data.data),
  delete:  (id)     => axiosInstance.delete(`/assets/${id}`).then(r => r.data),
};
