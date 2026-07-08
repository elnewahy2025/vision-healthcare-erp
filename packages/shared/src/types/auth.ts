export interface User {
  id: string;
  tenantId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roles: string[];
  permissions: string[];
  locale: 'ar' | 'en';
  status: UserStatus;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  passwordChangedAt: string;
  branchId?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserStatus = 'active' | 'inactive' | 'locked' | 'pending';

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PERMISSIONS = [
  'patient:read', 'patient:write', 'patient:delete',
  'appointment:read', 'appointment:write', 'appointment:delete',
  'emr:read', 'emr:write', 'emr:delete',
  'billing:read', 'billing:write', 'billing:delete',
  'inventory:read', 'inventory:write',
  'lab:read', 'lab:write',
  'radiology:read', 'radiology:write',
  'pharmacy:read', 'pharmacy:write',
  'hr:read', 'hr:write',
  'admin:access', 'admin:users', 'admin:settings',
  'report:read', 'report:export',
  'settings:read', 'settings:write',
] as const;

export type Permission = typeof PERMISSIONS[number];

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug: string;
  mfaCode?: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
  tenant: import('./multi-tenancy').TenantInfo;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
