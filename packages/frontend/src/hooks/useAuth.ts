import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api/auth';
import { queryKeys } from '../lib/query/queryKeys';

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => authApi.me(),
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string; tenantSlug: string }) =>
      authApi.login(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: { name: string; slug: string; adminEmail: string; adminPassword: string; adminName: string; locale?: string }) =>
      authApi.register(data),
  });
}
