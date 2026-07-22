import type { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../core/redis.js';
import { loggerOptions } from './logger.js';
import pino from 'pino';

const log = pino(loggerOptions);

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_FALLBACK_MAX = 1000;

function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0].trim();
  }
  return request.ip ?? '127.0.0.1';
}

function buildKey(ip: string, route: string): string {
  return `ratelimit:${ip}:${route}`;
}

/**
 * Distributed rate limiter backed by Redis.
 * Uses INCR + EXPIRE for atomic sliding window counter.
 * Falls back to in-memory Map if Redis is unavailable.
 */

// Fallback in-memory store (only used when Redis is down)
const fallbackStore = new Map<string, { count: number; resetAt: number }>();
let redisAvailable = true;

async function checkRedis(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

export function createRateLimiter(config: RateLimitConfig) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const ip = getClientIp(request);
    const route = request.routeOptions?.url ?? request.url;
    const key = buildKey(ip, route);
    const windowSeconds = Math.ceil(config.windowMs / 1000);

    try {
      // Try Redis-backed rate limiting
      if (redisAvailable) {
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.expire(key, windowSeconds);
        }

        if (count > config.maxRequests) {
          const ttl = await redis.ttl(key);
          const retryAfter = ttl > 0 ? ttl : windowSeconds;

          log.warn(
            { ip, route, count, maxRequests: config.maxRequests, windowMs: config.windowMs, backend: 'redis' },
            'Rate limit exceeded',
          );

          reply.code(429).header('Retry-After', String(retryAfter)).send({
            statusCode: 429,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          });
          return;
        }
        return;
      }
    } catch (err) {
      // Redis is down — log once and fall back to in-memory
      if (redisAvailable) {
        log.error({ err }, 'Redis unavailable for rate limiting, falling back to in-memory');
        redisAvailable = false;
        // Re-check Redis periodically
        setTimeout(async () => {
          redisAvailable = await checkRedis();
          if (redisAvailable) {
            log.info('Redis reconnected, resuming distributed rate limiting');
          }
        }, 30_000);
      }
    }

    // ── Fallback: in-memory rate limiting ──
    const now = Date.now();
    let entry = fallbackStore.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 1, resetAt: now + config.windowMs };
      fallbackStore.set(key, entry);
      return;
    }

    entry.count++;

    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      log.warn(
        { ip, route, count: entry.count, maxRequests: config.maxRequests, windowMs: config.windowMs, backend: 'memory-fallback' },
        'Rate limit exceeded (Redis unavailable)',
      );
      reply.code(429).header('Retry-After', String(retryAfter)).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      });
    }
  };
}

export const loginRateLimit = createRateLimiter({ maxRequests: 5, windowMs: 60_000 });
export const registerRateLimit = createRateLimiter({ maxRequests: 3, windowMs: 3_600_000 });
export const forgotPasswordRateLimit = createRateLimiter({ maxRequests: 3, windowMs: 3_600_000 });
export const refreshRateLimit = createRateLimiter({ maxRequests: 10, windowMs: 60_000 });
