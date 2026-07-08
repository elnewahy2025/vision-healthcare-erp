import type { FastifyReply } from 'fastify';
import type { ApiResponse } from '@healthcare/shared/types';

export function sendSuccess<T>(reply: FastifyReply, data: T, message?: string, statusCode = 200) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
  return reply.status(statusCode).send(response);
}

export function sendError(reply: FastifyReply, error: string, statusCode = 400) {
  const response: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  };
  return reply.status(statusCode).send(response);
}

export function sendPaginated<T>(
  reply: FastifyReply,
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  const response = {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    timestamp: new Date().toISOString(),
  };
  return reply.send(response);
}
