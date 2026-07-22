import { apiClient } from './client';

export const appointmentsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    apiClient.get('/appointments', { params }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get(`/appointments/${id}`).then((r) => r.data.data),
  create: (data: unknown) =>
    apiClient.post('/appointments', data).then((r) => r.data.data),
  update: (id: string, data: unknown) =>
    apiClient.put(`/appointments/${id}`, data).then((r) => r.data.data),
  checkIn: (id: string) =>
    apiClient.post(`/appointments/${id}/check-in`).then((r) => r.data.data),
  complete: (id: string) =>
    apiClient.post(`/appointments/${id}/complete`).then((r) => r.data.data),
  cancel: (id: string, reason?: string) =>
    apiClient.post(`/appointments/${id}/cancel`, { reason }).then((r) => r.data.data),
  today: () =>
    apiClient.get('/appointments/today/summary').then((r) => r.data.data),
  getSlots: (doctorId: string, date: string) =>
    apiClient.get(`/doctors/${doctorId}/slots`, { params: { date } }).then((r) => r.data.data),
};
