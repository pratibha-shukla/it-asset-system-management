import { createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { items: [] },
  reducers: {
    addNotification(state, { payload }) {
      state.items.push({ id: Date.now(), type: 'info', ...payload });
    },
    removeNotification(state, { payload }) {
      state.items = state.items.filter((n) => n.id !== payload);
    },
    clearNotifications(state) { state.items = []; },
  },
});

export const { addNotification, removeNotification, clearNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
