import { apiClient } from './client';

export const communicationsApi = {
  templates: () =>
    apiClient.get('/notification-templates').then(r => r.data.data),
  updateTemplate: (id: string, data: unknown) =>
    apiClient.put(`/notification-templates/${id}`, data).then(r => r.data.data),
  createTemplate: (data: unknown) =>
    apiClient.post('/notification-templates', data).then(r => r.data.data),
  testTemplate: (id: string, recipient: string) =>
    apiClient.post(`/notification-templates/${id}/test`, { recipient }).then(r => r.data.data),
  logs: (params?: Record<string, string | number | boolean | undefined>) =>
    apiClient.get('/notification-logs', { params }).then(r => r.data),
};
