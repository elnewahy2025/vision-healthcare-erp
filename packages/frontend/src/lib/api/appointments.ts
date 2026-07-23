import { apiClient } from './client';
import type { Appointment } from '../../types/appointment';

interface ListResponse {
  data: Appointment[];
  pagination: { total: number; totalPages: number; page: number; limit: number };
}

export const appointmentsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>): Promise<ListResponse> =>
    apiClient.get('/appointments', { params }).then((r) => r.data),
  get: (id: string): Promise<Appointment> =>
    apiClient.get(`/appointments/${id}`).then((r) => r.data.data),
  create: (data: unknown): Promise<Appointment> =>
    apiClient.post('/appointments', data).then((r) => r.data.data),
  update: (id: string, data: unknown): Promise<Appointment> =>
    apiClient.put(`/appointments/${id}`, data).then((r) => r.data.data),
  checkIn: (id: string): Promise<Appointment> =>
    apiClient.post(`/appointments/${id}/check-in`).then((r) => r.data.data),
  complete: (id: string): Promise<Appointment> =>
    apiClient.post(`/appointments/${id}/complete`).then((r) => r.data.data),
  cancel: (id: string, reason?: string): Promise<Appointment> =>
    apiClient.post(`/appointments/${id}/cancel`, { reason }).then((r) => r.data.data),
  today: () =>
    apiClient.get('/appointments/today/summary').then((r) => r.data.data),
  getSlots: (doctorId: string, date: string) =>
    apiClient.get(`/doctors/${doctorId}/slots`, { params: { date } }).then((r) => r.data.data),
  bulkCreate: (appointments: unknown[]): Promise<{ created: Appointment[]; conflicts: string[]; total: number }> =>
    apiClient.post('/appointments/bulk', { appointments }).then((r) => r.data.data),
  bulkCancel: (appointmentIds: string[], reason?: string): Promise<{ cancelled: number }> =>
    apiClient.post('/appointments/bulk/cancel', { appointmentIds, reason }).then((r) => r.data.data),
};
