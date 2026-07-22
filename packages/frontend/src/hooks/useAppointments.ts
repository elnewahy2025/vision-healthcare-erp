import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '../lib/api/appointments';
import { queryKeys } from '../lib/query/queryKeys';

export function useAppointmentList(params?: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: queryKeys.appointments.list(params),
    queryFn: () => appointmentsApi.list(params),
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(id),
    queryFn: () => appointmentsApi.get(id),
    enabled: !!id,
  });
}

export function useTodayAppointments() {
  return useQuery({
    queryKey: queryKeys.appointments.today,
    queryFn: () => appointmentsApi.today(),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => appointmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => appointmentsApi.update(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
    },
  });
}

export function useCheckInAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => appointmentsApi.checkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.today });
    },
  });
}

export function useCompleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => appointmentsApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.today });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => appointmentsApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments.today });
    },
  });
}
