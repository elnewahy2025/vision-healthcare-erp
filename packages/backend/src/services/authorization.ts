import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Knex } from 'knex';
import { ForbiddenError } from '@healthcare/shared/errors';
import type { Grant, PermissionScope } from '@healthcare/shared/authz';
import { db } from '../core/database.js';
import { getCachedPrincipal, setCachedPrincipal } from './authz-cache.js';

/**
 * Centralized authorization service — the only place permission/scope decisions
 * are made (see docs/engineering/AUTHORIZATION-SOUND-OF-TRUTH.md).
 *
 * A principal is the authenticated identity resolved from the membership table.
 * Effective grants are the union of role grants and direct grants, minus explicit
 * denials. The membership determines the user's organizational context (tenant,
 * branch, department). JWT carries only the membership reference.
 */

export interface Principal {
  kind: 'user' | 'patient';
  /** @deprecated Use userId instead. Kept for backward compatibility. */
  id: string;
  userId: string;
  membershipId: string;
  tenantId: string;
  branchId: string | null;
  departmentId: string | null;
  roles: string[];
  grants: Grant[];
  branches: string[];
  locale: 'ar' | 'en';
  authzVersion: number;
  status: string;
  membershipStatus: string;
}

export interface RequestCtx {
  tenantId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  branches: string[];
  locale: 'ar' | 'en';
  branchId?: string;
  requestId: string;
  principal: Principal;
}

const SCOPE_RANK: Record<PermissionScope, number> = {
  self: 0,
  assigned_patients: 1,
  department: 2,
  branch: 3,
  branches: 4,
  tenant: 5,
  system: 6,
};

/** True when a grant at `grantScope` covers a request at `requestedScope`. */
export function scopeCovers(grantScope: PermissionScope, requestedScope: PermissionScope): boolean {
  return SCOPE_RANK[grantScope] >= SCOPE_RANK[requestedScope];
}

export function uniquePermissionKeys(grants: Grant[]): string[] {
  return Array.from(new Set(grants.map((g) => g.permission))).sort();
}

/**
 * Load a staff user principal with effective grants from the membership table.
 *
 * The membership is the source of truth for organizational context (tenant,
 * branch, department). Roles and permissions are resolved via the tenant
 * context provided by the membership.
 *
 * Returns null when the membership is invalid, suspended, or the user does
 * not exist.
 *
 * See docs/engineering/AUTHORIZATION-SOUND-OF-TRUTH.md §6.1.
 */
export async function loadUserPrincipal(userId: string, membershipId: string): Promise<Principal | null> {
  // 0. Check cache first (5-minute TTL, invalidated on auth data changes)
  const cached = await getCachedPrincipal(userId, membershipId);
  if (cached) return cached;

  // 1. Load membership — this is the authoritative organizational context
  const membership = await db('memberships')
    .where({ id: membershipId, user_id: userId, status: 'active' })
    .first();
  if (!membership) return null;

  const tenantId = String(membership.tenant_id);

  // 2. Load user within this tenant
  const user = await db('users')
    .where({ id: userId, tenant_id: tenantId })
    .first();
  if (!user || user.status !== 'active') return null;

  // 3. Load roles via user_roles
  const roleRows = await db('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('user_roles.user_id', userId)
    .andWhere('user_roles.tenant_id', tenantId)
    .select('roles.slug');

  // 4. Load role grants (permission + scope pairs)
  const roleGrantRows = await db('role_permissions')
    .join('user_roles', 'role_permissions.role_id', 'user_roles.role_id')
    .where('user_roles.user_id', userId)
    .andWhere('user_roles.tenant_id', tenantId)
    .select('role_permissions.permission', 'role_permissions.scope');

  // 5. Load direct grants (type = 'allow')
  const directGrantRows = await db('user_permissions')
    .where({ user_id: userId, tenant_id: tenantId, type: 'allow' })
    .select('permission', 'scope');

  // 6. Load explicit denials (type = 'deny') — denials override allows
  const denialRows = await db('user_permissions')
    .where({ user_id: userId, tenant_id: tenantId, type: 'deny' })
    .select('permission');

  // 7. Build effective grants: (role grants ∪ direct grants) − denials
  const deniedPermissions = new Set(denialRows.map((r: { permission: string }) => String(r.permission)));

  const allowGrants: Grant[] = [
    ...roleGrantRows.map((r: { permission: string; scope: string }) => ({
      permission: String(r.permission),
      scope: String(r.scope) as PermissionScope,
    })),
    ...directGrantRows.map((r: { permission: string; scope: string }) => ({
      permission: String(r.permission),
      scope: String(r.scope) as PermissionScope,
    })),
  ];

  // Filter out denied permissions from the effective grants
  const grants = allowGrants.filter((g) => !deniedPermissions.has(g.permission));

  // 8. Load branch assignments (for scope resolution)
  const branchRows = await db('user_branches')
    .where({ user_id: userId, tenant_id: tenantId })
    .select('branch_id');

  // Cache the resolved principal for subsequent requests (5-min TTL)
  const principal: Principal = {
    kind: 'user' as const,
    id: userId,
    userId,
    membershipId: String(membership.id),
    tenantId,
    branchId: membership.branch_id ? String(membership.branch_id) : null,
    departmentId: membership.department_id ? String(membership.department_id) : null,
    roles: roleRows.map((r: { slug: string }) => String(r.slug)),
    grants,
    branches: branchRows.map((b: { branch_id: string }) => String(b.branch_id)),
    locale: user.locale === 'ar' ? 'ar' : 'en',
    authzVersion: Number(membership.authz_version || 0),
    status: String(user.status || 'active'),
    membershipStatus: String(membership.status || 'active'),
  };

  // Cache for next request
  await setCachedPrincipal(userId, membershipId, principal);

  return principal;
}

/**
 * Core permission check. A wildcard '*' grant (super_admin) passes everything.
 * When `requestedScope` is provided, the grant's scope must cover it.
 *
 * Denials are already excluded from the grants array in loadUserPrincipal(),
 * so no additional deny-check is needed here.
 */
export function hasPermission(
  principal: Principal,
  permission: string,
  requestedScope?: PermissionScope,
): boolean {
  const candidates = principal.grants.filter((g) => g.permission === '*' || g.permission === permission);
  if (candidates.length === 0) return false;
  if (!requestedScope) return true;
  return candidates.some((g) => scopeCovers(g.scope, requestedScope as PermissionScope));
}

export function anyPermission(
  principal: Principal,
  permissions: string[],
  requestedScope?: PermissionScope,
): boolean {
  return permissions.some((p) => hasPermission(principal, p, requestedScope));
}

/**
 * Fastify preHandler guard — enforces permission + scope before a handler runs.
 * Usage: preHandler: [authenticate, authorize('patients.view', 'branch')]
 */
export function authorize(permission: string, requestedScope?: PermissionScope) {
  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const req = request as FastifyRequest & { ctx?: { principal?: Principal } };
    const principal = req.ctx?.principal;
    if (!principal) throw new ForbiddenError('Authorization context missing');
    if (!hasPermission(principal, permission, requestedScope)) {
      throw new ForbiddenError(
        `Missing permission: ${permission}${requestedScope ? ` (scope: ${requestedScope})` : ''}`,
      );
    }
  };
}

/**
 * Apply tenant isolation + scope filters to a query builder.
 * The tenant filter is always applied; scope filters narrow by the principal's
 * own assignments (branches/department). Callers must still run authorize()
 * — this never widens access.
 */
export function scopeQuery<T extends Knex.QueryBuilder>(
  qb: T,
  principal: Principal,
  opts: {
    tenantColumn?: string;
    branchColumn?: string;
    departmentColumn?: string;
    scope?: PermissionScope;
  } = {},
): T {
  const tenantColumn = opts.tenantColumn || 'tenant_id';
  qb = qb.andWhere(tenantColumn, principal.tenantId) as T;
  if (!opts.scope || opts.scope === 'tenant' || opts.scope === 'system') return qb;
  if ((opts.scope === 'branch' || opts.scope === 'branches') && opts.branchColumn) {
    if (principal.branches.length > 0) {
      qb = qb.whereIn(opts.branchColumn, principal.branches) as T;
    } else {
      qb = qb.where(false) as T; // no assigned branches → no rows
    }
  } else if (opts.scope === 'department' && opts.departmentColumn) {
    if (principal.departmentId) {
      qb = qb.andWhere(opts.departmentColumn, principal.departmentId) as T;
    } else {
      qb = qb.where(false) as T;
    }
  }
  return qb;
}

/** Patient ids assigned to this principal (doctor/nurse via appointments/orders). */
export async function assignedPatientIds(principal: Principal): Promise<string[]> {
  const rows = await db('appointments')
    .where({ tenant_id: principal.tenantId, doctor_id: principal.userId })
    .whereNotNull('patient_id')
    .distinct('patient_id');
  return rows.map((r: { patient_id: string }) => String(r.patient_id));
}

/**
 * Pure scope check for a single patient record (no DB access). Returns true
 * when the principal's `patients.view` grant scope covers this patient's
 * branch/assignment relationship. Used by canAccessPatient and unit tests.
 */
export function patientAccessByScope(
  principal: Principal,
  patient: { id: string; tenant_id: string; branch_id?: string | null; department_id?: string | null },
): boolean {
  if (principal.tenantId !== patient.tenant_id) return false;

  const scopes = new Set(
    principal.grants
      .filter((g) => g.permission === '*' || g.permission === 'patients.view')
      .map((g) => g.scope),
  );
  if (scopes.has('system') || scopes.has('tenant')) return true;
  if (
    (scopes.has('branch') || scopes.has('branches')) &&
    patient.branch_id &&
    principal.branches.includes(String(patient.branch_id))
  ) {
    return true;
  }
  if (scopes.has('assigned_patients')) {
    return true; // assignment membership is resolved by the caller via assignedPatientIds
  }
  return false;
}

/**
 * True when the principal holds an active, unexpired break-glass
 * emergency-access grant for this patient.
 */
export async function hasEmergencyAccess(principal: Principal, patientId: string): Promise<boolean> {
  const row = await db('emergency_access')
    .where({
      tenant_id: principal.tenantId,
      user_id: principal.userId,
      patient_id: patientId,
      status: 'active',
    })
    .where('expires_at', '>', new Date())
    .first();
  return Boolean(row);
}

/**
 * True when a principal may access a specific patient record.
 * Tenant mismatch always denies; scope is checked against the patient's
 * branch/department/assignment relationships. An active, audited
 * emergency-access grant is a controlled last-resort override.
 */
export async function canAccessPatient(
  principal: Principal,
  patient: { id: string; tenant_id: string; branch_id?: string | null; department_id?: string | null },
): Promise<boolean> {
  if (principal.tenantId !== patient.tenant_id) return false;
  if (hasPermission(principal, 'patients.view', 'assigned_patients')) {
    const broader =
      hasPermission(principal, 'patients.view', 'branch') ||
      hasPermission(principal, 'patients.view', 'branches') ||
      hasPermission(principal, 'patients.view', 'tenant') ||
      hasPermission(principal, 'patients.view', 'system');
    if (!broader && !(await assignedPatientIds(principal)).includes(patient.id)) {
      return false;
    }
  }
  if (patientAccessByScope(principal, patient)) return true;
  if (await hasEmergencyAccess(principal, patient.id)) return true;
  return false;
}
