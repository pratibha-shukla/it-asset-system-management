import axiosInstance from './axiosInstance';

export const chatbotApi = {
  // Unlike other endpoints, the backend returns the payload directly as
  // { answer } — not wrapped in the { data: {...} } envelope — so unwrap
  // with r.data here, not r.data.data.
  ask: (question) => axiosInstance.post('/chatbot/query', { question }).then((r) => r.data),
};
