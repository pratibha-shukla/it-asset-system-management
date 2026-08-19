import axiosInstance from './axiosInstance';

export const adminApi = {
  getStats:       ()       => axiosInstance.get('/admin/stats').then((r) => r.data.data),
  getUsers:       (params) => axiosInstance.get('/admin/users', { params }).then((r) => r.data.data),
  getUser:        (id)     => axiosInstance.get(`/admin/users/${id}`).then((r) => r.data.data),
  getAuditLogs:   (params) => axiosInstance.get('/admin/audit-logs', { params }).then((r) => r.data.data),
  deactivateUser: (id)     => axiosInstance.put(`/admin/users/${id}/deactivate`).then((r) => r.data),
  updateUser:     (id, data) => axiosInstance.patch(`/admin/users/${id}`, data).then((r) => r.data),
  resetPassword:  (id, password) => axiosInstance.put(`/admin/users/${id}/reset-password`, { password }).then((r) => r.data),
  getBranches:      ()            => axiosInstance.get('/branches').then((r) => r.data.data),
  createBranch:     (data)        => axiosInstance.post('/branches', data).then((r) => r.data.data),
  updateBranch:     (id, data)    => axiosInstance.put(`/branches/${id}`, data).then((r) => r.data.data),
  getApprovedReqs:  ()            => axiosInstance.get('/requests', { params: { status: 'APPROVED', size: 50 } }).then((r) => r.data.data),
  getAvailableAssets: ()          => axiosInstance.get('/assets', { params: { status: 'AVAILABLE', size: 100 } }).then((r) => r.data.data),
  fulfillRequest:   (id, assetId) => axiosInstance.put(`/requests/${id}/fulfill`, null, { params: { assetId } }).then((r) => r.data.data),
};
