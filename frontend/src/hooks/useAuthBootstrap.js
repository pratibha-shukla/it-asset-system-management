import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { setCredentials } from '../store/authSlice';

/**
 * With the JWT in an httpOnly cookie, the frontend can no longer read it to
 * decide "am I logged in" synchronously on boot (the old sessionStorage
 * hydration). Instead it asks the server once via GET /auth/me — succeeds
 * only if a valid auth cookie is present — and hydrates Redux from the result.
 *
 * isPending is true only until the query FIRST settles either way (success or
 * error) — a 401 (not logged in) is an expected, non-error outcome for the
 * caller of this hook, not something to retry or surface.
 */
export function useAuthBootstrap() {
  const dispatch = useDispatch();
  const { data, isSuccess, isPending } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (isSuccess && data) dispatch(setCredentials(data));
  }, [isSuccess, data, dispatch]);

  return { isChecking: isPending };
}
