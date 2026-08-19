import { apiClient } from './client';
import { setAccessToken, setCsrfToken } from './client';

export const authApi = {
  login: async (data: { email: string; password: string; tenantSlug: string }) => {
    const response = await apiClient.post('/auth/login', data);
    const result = response.data.data;
    // Access token goes to memory only; refresh token is in HttpOnly cookie
    if (result.accessToken) {
      setAccessToken(result.accessToken);
    }
    if (result.csrfToken) {
      setCsrfToken(result.csrfToken);
    }
    return result;
  },
  register: (data: { name: string; slug: string; adminEmail: string; adminPassword: string; adminName: string; locale?: string }) =>
    apiClient.post('/tenants', data).then((r) => r.data.data),
  me: () =>
    apiClient.get('/auth/me').then((r) => r.data.data),
  refresh: async () => {
    const response = await apiClient.post('/auth/refresh', {});
    const result = response.data.data;
    if (result.accessToken) {
      setAccessToken(result.accessToken);
    }
    if (result.csrfToken) {
      setCsrfToken(result.csrfToken);
    }
    return result;
  },
  verifyMfa: async (code: string, partialToken: string) => {
    const response = await apiClient.post('/auth/mfa/verify', { code, partialToken });
    const result = response.data.data;
    if (result.accessToken) {
      setAccessToken(result.accessToken);
    }
    if (result.csrfToken) {
      setCsrfToken(result.csrfToken);
    }
    return result;
  },
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setCsrfToken(null);
    }
  },
  /** Get all active memberships for the current user */
  getMemberships: async () => {
    const response = await apiClient.get('/auth/memberships');
    return response.data.data;
  },
  /** Switch active membership (multi-tenant / multi-branch users) */
  switchMembership: async (membershipId: string) => {
    const response = await apiClient.post('/auth/switch-membership', { membershipId });
    const result = response.data.data;
    if (result.accessToken) {
      setAccessToken(result.accessToken);
    }
    return result;
  },
};
