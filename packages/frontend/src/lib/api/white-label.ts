import { apiClient } from './client';

export interface TenantBranding {
  id?: string;
  brandName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  customCss: string | null;
  customJs: string | null;
  emailTemplates: Record<string, unknown>;
  loginPage: Record<string, unknown>;
}

export interface TenantDomain {
  id: string;
  domain: string;
  isPrimary: boolean;
  isVerified: boolean;
  sslStatus: string;
  verifiedAt: string | null;
  createdAt: string;
}

export interface UpdateBrandingPayload {
  brandName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  customCss?: string;
  customJs?: string;
}

export interface AddDomainPayload {
  domain: string;
  isPrimary?: boolean;
}

export const whiteLabelApi = {
  getBranding: () =>
    apiClient.get('/white-label/branding').then((r) => r.data.data as TenantBranding),
  updateBranding: (data: UpdateBrandingPayload) =>
    apiClient.put('/white-label/branding', data).then((r) => r.data.data),
  listDomains: () =>
    apiClient.get('/white-label/domains').then((r) => r.data.data as TenantDomain[]),
  addDomain: (data: AddDomainPayload) =>
    apiClient.post('/white-label/domains', data).then((r) => r.data.data),
  verifyDomain: (id: string) =>
    apiClient.post(`/white-label/domains/${id}/verify`).then((r) => r.data.data),
  deleteDomain: (id: string) =>
    apiClient.delete(`/white-label/domains/${id}`).then((r) => r.data.data),
  getSettings: () =>
    apiClient.get('/white-label/settings').then((r) => r.data.data),
};
