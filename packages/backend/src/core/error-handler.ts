import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '@healthcare/shared/errors';

export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  request.log.error(error);

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
