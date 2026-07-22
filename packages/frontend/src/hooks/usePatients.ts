import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi } from '../lib/api/patients';
import { queryKeys } from '../lib/query/queryKeys';

export function usePatientList(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: queryKeys.patients.list(params),
    queryFn: () => patientsApi.list(params),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: queryKeys.patients.detail(id),
    queryFn: () => patientsApi.get(id),
    enabled: !!id,
  });
}

export function usePatientSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.patients.search(q),
    queryFn: () => patientsApi.search(q),
    enabled: q.length >= 2,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => patientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => patientsApi.update(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
  });
}
