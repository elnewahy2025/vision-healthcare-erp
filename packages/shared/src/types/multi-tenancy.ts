export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  locale: 'ar' | 'en';
  direction: 'rtl' | 'ltr';
  settings: {
    dateFormat: string;
    currency: string;
    timezone: string;
    theme: {
      primaryColor: string;
      logo?: string;
      brandName: string;
    };
  };
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  locale: 'ar' | 'en';
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

export type TenantStatus = 'active' | 'suspended' | 'trial' | 'disabled';
