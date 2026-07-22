import type { FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

const CLEANUP_INTERVAL = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(): void {
  if (cleanupTimer === null) {
    cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL);
    if (cleanupTimer.unref) {
      cleanupTimer.unref();
    }
  }
}

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

export function createRateLimiter(config: RateLimitConfig) {
  ensureCleanup();

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const ip = getClientIp(request);
    const route = request.routeOptions?.url ?? request.url;
    const key = `${ip}:${route}`;
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 1, resetAt: now + config.windowMs };
      store.set(key, entry);
      return;
    }

    entry.count++;

    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
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
