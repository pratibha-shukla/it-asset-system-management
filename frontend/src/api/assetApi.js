import axiosInstance from './axiosInstance';

export const assetApi = {
  search:   (params) => axiosInstance.get('/assets', { params }).then((r) => r.data.data),
  getById:  (id)     => axiosInstance.get(`/assets/${id}`).then((r) => r.data.data),
  create:   (data)   => axiosInstance.post('/assets', data).then((r) => r.data.data),
  update:   (id, d)  => axiosInstance.put(`/assets/${id}`, d).then((r) => r.data.data),
  delete:   (id)     => axiosInstance.delete(`/assets/${id}`).then((r) => r.data),
  assign:   (assetId, userId) => axiosInstance.put(`/assets/${assetId}/assign/${userId}`).then((r) => r.data),
  unassign: (assetId)         => axiosInstance.put(`/assets/${assetId}/unassign`).then((r) => r.data),
};
