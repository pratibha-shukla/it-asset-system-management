import axiosInstance from './axiosInstance';

export const authApi = {
  login:    (data) => axiosInstance.post('/auth/login', data).then((r) => r.data.data),
  register: (data) => axiosInstance.post('/auth/register', data).then((r) => r.data.data),
  // Server-side "who am I" check — the frontend can no longer read the
  // httpOnly auth cookie itself, so it asks the server on app boot instead.
  me:     () => axiosInstance.get('/auth/me').then((r) => r.data.data),
  logout: () => axiosInstance.post('/auth/logout').then((r) => r.data),
};
