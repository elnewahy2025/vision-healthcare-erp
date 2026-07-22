import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '@healthcare/shared/errors';
import { captureError } from '../services/sentry.js';
import { ZodError } from 'zod';
import { getEnv } from '@healthcare/shared/config';

const env = getEnv();
const isProduction = env.NODE_ENV === 'production';

export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  request.log.error(error);

  // Handle Zod validation errors → 400
  if (error instanceof ZodError) {
    const formatted = error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return reply.status(400).send({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: formatted,
      timestamp: new Date().toISOString(),
    });
  }

  // Capture in Sentry (only 5xx errors)
  if (!('statusCode' in error) || (typeof error.statusCode === 'number' && error.statusCode >= 500)) {
    captureError({
      exception: error instanceof Error ? error : new Error(String(error)),
      level: 'error',
      extra: {
        url: request.url,
        method: request.method,
        headers: {
          'user-agent': request.headers['user-agent'],
          'content-type': request.headers['content-type'],
        },
        queryString: request.query,
      },
      tags: {
        endpoint: request.url,
        method: request.method,
      },
    });
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
      timestamp: new Date().toISOString(),
    });
  }

  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  // Generic 500 — never leak internal details
  return reply.status(500).send({
    success: false,
    error: isProduction ? 'Internal server error' : error.message,
    ...(isProduction ? {} : { stack: error.stack }),
    timestamp: new Date().toISOString(),
  });
}
