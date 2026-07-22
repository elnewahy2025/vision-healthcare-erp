import { apiClient } from './client';

export const auditApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    apiClient.get('/audit-logs', { params }).then(r => r.data),
  get: (id: string) =>
    apiClient.get(`/audit-logs/${id}`).then(r => r.data.data),
  actionTypes: () =>
    apiClient.get('/audit-logs/actions/types').then(r => r.data.data),
};
