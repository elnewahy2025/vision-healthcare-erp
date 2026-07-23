import type { FastifyInstance } from 'fastify';
import { loginRateLimit, registerRateLimit, forgotPasswordRateLimit, refreshRateLimit } from '../../utils/rate-limiter.js';
import {
  registerTenant, login, mfaVerify, refreshToken, logout, me,
  listSessions, revokeSession, forgotPassword, resetPassword, changePassword,
  verifyEmail, resendVerification, mfaSetup, mfaEnable, mfaDisable,
  sendOtp, verifyOtpHandler,
} from './auth.controller.js';

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/api/v1/tenants', { preHandler: [registerRateLimit] }, registerTenant);
  app.post('/api/v1/auth/login', { preHandler: [loginRateLimit] }, login);
  app.post('/api/v1/auth/mfa/verify', mfaVerify);
  app.post('/api/v1/auth/refresh', { preHandler: [refreshRateLimit] }, refreshToken);
  app.post('/api/v1/auth/logout', logout);
  app.get('/api/v1/auth/me', me);
  app.get('/api/v1/auth/sessions', listSessions);
  app.delete('/api/v1/auth/sessions/:sessionId', revokeSession);
  app.post('/api/v1/auth/forgot-password', { preHandler: [forgotPasswordRateLimit] }, forgotPassword);
  app.post('/api/v1/auth/reset-password', resetPassword);
  app.post('/api/v1/auth/change-password', changePassword);
  app.post('/api/v1/auth/verify-email', verifyEmail);
  app.post('/api/v1/auth/resend-verification', { preHandler: [forgotPasswordRateLimit] }, resendVerification);
  app.post('/api/v1/auth/mfa/setup', mfaSetup);
  app.post('/api/v1/auth/mfa/enable', mfaEnable);
  app.post('/api/v1/auth/mfa/disable', mfaDisable);
  app.post('/api/v1/auth/otp/send', sendOtp);
  app.post('/api/v1/auth/otp/verify', verifyOtpHandler);
}
