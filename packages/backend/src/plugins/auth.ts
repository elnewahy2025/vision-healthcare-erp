import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from '@fastify/jwt';
import { getEnv } from '@healthcare/shared/config';
import { UnauthorizedError, ForbiddenError } from '@healthcare/shared/errors';
import { db } from '../core/database.js';

const env = getEnv();

/**
 * JWT auth plugin — registers @fastify/jwt and type declarations.
 *
 * NOTE: The actual `authenticate` decorator is defined in index.ts.
 * This file only registers the JWT library and declares TypeScript types
 * for the JWT payload shape.
 *
 * See docs/engineering/AUTHORIZATION-SOUND-OF-TRUTH.md §5.
 */
export async function authPlugin(app: FastifyInstance) {
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '15m' },
  });
}

/**
 * JWT payload type declarations.
 *
 * The JWT contains ONLY identity references per AUTHORIZATION-SOUND-OF-TRUTH.md §5:
 *   sub  — user_id (subject)
 *   mid  — active_membership_id
 *   sid  — session_id
 *   authz_version — for staleness detection
 *
 * JWT NEVER contains: tenantId, branchId, departmentId, roles, permissions.
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;           // user_id (subject)
      mid: string;           // active_membership_id
      sid: string;           // session_id
      authz_version: number; // authorization version for staleness detection
      iat: number;
      exp: number;
      /** @deprecated Used only for MFA partial tokens */
      mfaPending?: boolean;
    };
    user: {
      sub: string;
      mid: string;
      sid: string;
      authz_version: number;
      iat: number;
      exp: number;
      mfaPending?: boolean;
    };
  }
}
