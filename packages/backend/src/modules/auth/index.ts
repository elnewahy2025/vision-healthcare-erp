import type { FastifyInstance } from 'fastify';
import { registerAuthRoutes } from './auth.routes.js';
import { csrfValidation } from './auth.controller.js';

export async function registerAuthModule(app: FastifyInstance) {
  // Register CSRF validation as onRequest hook for state-changing methods
  app.addHook('onRequest', csrfValidation);
  await registerAuthRoutes(app);
}

export { csrfValidation } from './auth.controller.js';
export type { TenantSettings, MfaPartialPayload, JwtHelper } from './auth.types.js';
