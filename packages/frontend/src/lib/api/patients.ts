import { apiClient } from './client';

export const patientsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    apiClient.get('/patients', { params }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get(`/patients/${id}`).then((r) => r.data.data),
  create: (data: unknown) =>
    apiClient.post('/patients', data).then((r) => r.data.data),
  update: (id: string, data: unknown) =>
    apiClient.put(`/patients/${id}`, data).then((r) => r.data.data),
  delete: (id: string) =>
    apiClient.delete(`/patients/${id}`).then((r) => r.data.data),
  search: (q: string) =>
    apiClient.get('/patients/search/quick', { params: { q } }).then((r) => r.data.data),
};
