import { configureStore } from '@reduxjs/toolkit';
import authReducer         from './authSlice';
import notificationReducer from './notificationSlice';
import uiReducer           from './uiSlice';

export const store = configureStore({
  reducer: {
    auth:          authReducer,
    notifications: notificationReducer,
    ui:            uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: { ignoredActions: ['auth/setCredentials'] } }),
  devTools: import.meta.env.DEV,
});

export default store;
