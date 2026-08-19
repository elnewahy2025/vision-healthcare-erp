export interface TenantSettings {
  direction?: string;
  dateFormat?: string;
  currency?: string;
  timezone?: string;
  theme?: Record<string, unknown>;
}

/**
 * MFA partial payload — issued before MFA verification is complete.
 * Contains only enough identity to complete login after MFA.
 */
export interface MfaPartialPayload {
  userId: string;
  mfaPending: boolean;
}

/**
 * JWT access token payload per AUTHORIZATION-SOUND-OF-TRUTH.md §5.
 *
 * Contains ONLY identity references. Never tenant, branch, department,
 * roles, or permissions.
 */
export interface AccessTokenPayload {
  sub: string;          // user_id (subject)
  mid: string;          // active_membership_id
  sid: string;          // session_id
  authz_version: number;
  iat: number;
  exp: number;
}

export interface JwtHelper {
  sign(payload: Record<string, unknown>, opts: { expiresIn: string }): string;
  verify(token: string): Record<string, unknown>;
}
