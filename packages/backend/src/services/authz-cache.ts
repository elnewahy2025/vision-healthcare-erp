import { redis, CACHE_TTL } from '../core/redis.js';
import type { Principal } from './authorization.js';

/**
 * Authorization cache layer per AUTHORIZATION-SOUND-OF-TRUTH.md §9.
 *
 * Caches resolved Principal objects in Redis to avoid repeated DB queries
 * on every request. Cache is invalidated immediately when authorization
 * data changes (roles, permissions, memberships, direct grants).
 *
 * Cache keys follow the pattern:
 *   auth:principal:{userId}:{membershipId}
 *
 * TTL: 5 minutes (CACHE_TTL.MEDIUM).
 * This is a safety net — explicit invalidation is the primary mechanism.
 */

const PREFIX = 'authz:';
const TTL = CACHE_TTL.MEDIUM; // 5 minutes

// ── Cache key builders ──

function principalKey(userId: string, membershipId: string): string {
  return `${PREFIX}principal:${userId}:${membershipId}`;
}

function userPattern(userId: string): string {
  return `${PREFIX}principal:${userId}:*`;
}

function membershipPattern(membershipId: string): string {
  return `${PREFIX}principal:*:${membershipId}`;
}

// ── Cache get/set ──

/**
 * Retrieve a cached Principal. Returns null on miss or Redis error.
 * Never throws — cache miss is not an error.
 */
export async function getCachedPrincipal(
  userId: string,
  membershipId: string,
): Promise<Principal | null> {
  try {
    const key = principalKey(userId, membershipId);
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as Principal;
  } catch {
    // Redis unavailable — degrade to DB-only (no crash)
    return null;
  }
}

/**
 * Store a Principal in the cache.
 */
export async function setCachedPrincipal(
  userId: string,
  membershipId: string,
  principal: Principal,
): Promise<void> {
  try {
    const key = principalKey(userId, membershipId);
    await redis.setex(key, TTL, JSON.stringify(principal));
  } catch {
    // Best-effort — cache write failure is not critical
  }
}

// ── Cache invalidation ──

/**
 * Invalidate all cached principals for a specific user.
 * Called when: roles change, permissions change, user status changes.
 */
export async function invalidateUserAuthz(userId: string): Promise<void> {
  try {
    const pattern = userPattern(userId);
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Best-effort
  }
}

/**
 * Invalidate all cached principals for a specific membership.
 * Called when: membership is updated, suspended, or deleted.
 */
export async function invalidateMembershipAuthz(membershipId: string): Promise<void> {
  try {
    const pattern = membershipPattern(membershipId);
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Best-effort
  }
}

/**
 * Invalidate a specific user+membership principal.
 * Called when: that specific membership's context changes.
 */
export async function invalidatePrincipal(
  userId: string,
  membershipId: string,
): Promise<void> {
  try {
    const key = principalKey(userId, membershipId);
    await redis.del(key);
  } catch {
    // Best-effort
  }
}

/**
 * Invalidate all cached principals for a set of users.
 * Bulk operation for role permission changes that affect multiple users.
 */
export async function invalidateBulkUserAuthz(userIds: string[]): Promise<void> {
  try {
    for (const userId of userIds) {
      const keys = await redis.keys(userPattern(userId));
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch {
    // Best-effort
  }
}

/**
 * Increment the authz_version for a membership.
 * Returns the new version number.
 */
export async function incrementAuthzVersion(
  membershipId: string,
): Promise<number> {
  try {
    const versionKey = `${PREFIX}version:${membershipId}`;
    const newVersion = await redis.incr(versionKey);
    // Set a long TTL on version counter — it should outlive the principal cache
    await redis.expire(versionKey, CACHE_TTL.LONG);
    return newVersion;
  } catch {
    // If Redis is down, return 0 to signal "skip version check"
    return 0;
  }
}

/**
 * Get the cached authz_version for a membership.
 * Returns null if not cached.
 */
export async function getCachedAuthzVersion(
  membershipId: string,
): Promise<number | null> {
  try {
    const versionKey = `${PREFIX}version:${membershipId}`;
    const val = await redis.get(versionKey);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}
