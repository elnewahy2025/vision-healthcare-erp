import { z } from 'zod';

const TENANT_SLUG_REGEX = /^[a-z0-9-]{3,30}$/;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export { PASSWORD_COMPLEXITY_REGEX, TENANT_SLUG_REGEX };

export const registerTenantSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().regex(TENANT_SLUG_REGEX, '3-30 chars, lowercase, hyphens only'),
  locale: z.enum(['ar', 'en']).default('en'),
  adminEmail: z.string().email(),
  adminPassword: z.string().regex(PASSWORD_COMPLEXITY_REGEX, 'Password must be at least 8 characters with uppercase, lowercase, digit, and special character'),
  adminName: z.string().min(2),
  website: z.string().max(0).optional().default(''),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
  mfaCode: z.string().optional(),
});

export const mfaVerifySchema = z.object({
  code: z.string().length(6),
  partialToken: z.string(),
});

export const refreshSchema = z.object({
  refreshToken: z.string(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export const sessionIdSchema = z.object({
  sessionId: z.string().uuid(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  tenantSlug: z.string(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().regex(PASSWORD_COMPLEXITY_REGEX, 'Password must be at least 8 characters with uppercase, lowercase, digit, and special character'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().regex(PASSWORD_COMPLEXITY_REGEX, 'Password must be at least 8 characters with uppercase, lowercase, digit, and special character'),
});

export const verifyEmailSchema = z.object({
  token: z.string(),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
  tenantSlug: z.string(),
});

export const mfaEnableSchema = z.object({
  code: z.string().length(6),
});

export const mfaDisableSchema = z.object({
  code: z.string().length(6),
});

export const otpSendSchema = z.object({
  identifier: z.string(),
  tenantSlug: z.string(),
});

export const otpVerifySchema = z.object({
  identifier: z.string(),
  code: z.string(),
  purpose: z.string().optional(),
});
