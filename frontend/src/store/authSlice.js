import { createSlice } from '@reduxjs/toolkit';

// No sessionStorage/localStorage here on purpose — the JWT lives in an
// httpOnly cookie the browser attaches automatically, and this app never
// caches even the non-secret user profile client-side. On every fresh page
// load, `useAuthBootstrap` asks the server "who am I" (GET /auth/me, which
// only succeeds if the cookie is present and valid) to (re)hydrate this state.
const initialState = { user: null, isAuthenticated: false };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, { payload }) {
      const { userId, name, email, role, branchId, branchName } = payload;
      state.isAuthenticated = true;
      state.user = { userId, name, email, role, branchId, branchName };
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
    },
    updateUser(state, { payload }) {
      state.user = { ...state.user, ...payload };
    },
  },
});

export const { setCredentials, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
export const selectCurrentUser = (s) => s.auth.user;
export const selectIsAuth      = (s) => s.auth.isAuthenticated;
export const selectIsAdmin     = (s) => s.auth.user?.role === 'ADMIN';
export const selectIsManager   = (s) => s.auth.user?.role === 'MANAGER';
