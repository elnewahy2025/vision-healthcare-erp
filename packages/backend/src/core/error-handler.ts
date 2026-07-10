import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '@healthcare/shared/errors';
import { captureError } from '../services/sentry.js';

export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  request.log.error(error);

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

  return reply.status(500).send({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
}
