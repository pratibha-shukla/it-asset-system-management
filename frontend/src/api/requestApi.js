import axiosInstance from './axiosInstance';

export const requestApi = {
  getAll:  (params)      => axiosInstance.get('/requests', { params }).then((r) => r.data.data),
  submit:  (data)        => axiosInstance.post('/requests', data).then((r) => r.data.data),
  approve: (id, notes)   => axiosInstance.put(`/requests/${id}/approve`, null, { params: { notes } }).then((r) => r.data.data),
  reject:  (id, notes)   => axiosInstance.put(`/requests/${id}/reject`,  null, { params: { notes } }).then((r) => r.data.data),
};

// Manager-specific API calls
export const managerApi = {
  // Team requests — only employees whose managerId = current manager
  getTeamRequests: (params) => axiosInstance.get('/manager/requests', { params }).then((r) => r.data.data),
  // Team assets — assets assigned to team members
  getTeamAssets:   (params) => axiosInstance.get('/manager/team-assets', { params }).then((r) => r.data.data),
  // Team stats for dashboard widget
  getTeamStats:    ()       => axiosInstance.get('/manager/stats').then((r) => r.data.data),
  // Approve/reject — manager-scoped endpoints (backend checks manager owns the employee)
  approve: (id, notes) => axiosInstance.put(`/manager/requests/${id}/approve`, null, { params: { notes } }).then((r) => r.data.data),
  reject:  (id, notes) => axiosInstance.put(`/manager/requests/${id}/reject`,  null, { params: { notes } }).then((r) => r.data.data),
};
