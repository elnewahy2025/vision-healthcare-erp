export interface TenantSettings {
  direction?: string;
  dateFormat?: string;
  currency?: string;
  timezone?: string;
  theme?: Record<string, unknown>;
}

export interface MfaPartialPayload {
  tenantId: string;
  userId: string;
  mfaPending: boolean;
}

export interface JwtHelper {
  sign(payload: Record<string, unknown>, opts: { expiresIn: string }): string;
  verify(token: string): Record<string, unknown>;
}
