import { apiClient } from './client';

export const securityApi = {
  forgotPassword: (email: string, tenantSlug: string) =>
    apiClient.post('/auth/forgot-password', { email, tenantSlug }).then(r => r.data.data),
  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }).then(r => r.data.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/auth/change-password', { currentPassword, newPassword }).then(r => r.data.data),
  mfaSetup: () =>
    apiClient.post('/auth/mfa/setup').then(r => r.data.data),
  mfaEnable: (code: string) =>
    apiClient.post('/auth/mfa/enable', { code }).then(r => r.data.data),
  mfaDisable: (code: string) =>
    apiClient.post('/auth/mfa/disable', { code }).then(r => r.data.data),
  mfaVerify: (partialToken: string, code: string) =>
    apiClient.post('/auth/mfa/verify', { partialToken, code }).then(r => r.data.data),
  sendOtp: (identifier: string, tenantSlug: string) =>
    apiClient.post('/auth/otp/send', { identifier, tenantSlug }).then(r => r.data.data),
  verifyOtp: (identifier: string, code: string, purpose?: string) =>
    apiClient.post('/auth/otp/verify', { identifier, code, purpose }).then(r => r.data.data),
};
