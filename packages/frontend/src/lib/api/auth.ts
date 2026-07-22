import { apiClient } from './client';

export const authApi = {
  login: (data: { email: string; password: string; tenantSlug: string }) =>
    apiClient.post('/auth/login', data).then((r) => r.data.data),
  register: (data: { name: string; slug: string; adminEmail: string; adminPassword: string; adminName: string; locale?: string }) =>
    apiClient.post('/tenants', data).then((r) => r.data.data),
  me: () =>
    apiClient.get('/auth/me').then((r) => r.data.data),
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }).then((r) => r.data.data),
};
