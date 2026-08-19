import { useSelector, useDispatch } from 'react-redux';
import { logout as logoutAction } from '../store/authSlice';
import { authApi } from '../api/authApi';
import { queryClient } from '../queryClient';

export function useAuth() {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  return {
    user,
    isAuthenticated,
    isAdmin:    user?.role === 'ADMIN',
    isManager:  user?.role === 'MANAGER',
    isEmployee: user?.role === 'EMPLOYEE',
    logout: async () => {
      // Wait for the server to actually clear the auth cookie BEFORE wiping
      // the query cache. useAuthBootstrap's `/auth/me` query stays mounted
      // app-wide (it's outside <Routes>), so clearing the cache immediately
      // triggers a refetch — if that raced ahead of the server-side cookie
      // clear, it would come back successful and silently re-authenticate
      // the same user right after they logged out.
      try { await authApi.logout(); } catch { /* clear local state regardless */ }
      dispatch(logoutAction());
      // Query keys (assets, requests, admin stats, ...) aren't scoped by user
      // identity — clear the cache so nothing from this session lingers in
      // memory for the next person who logs in on this tab/machine.
      queryClient.clear();
    },
  };
}
