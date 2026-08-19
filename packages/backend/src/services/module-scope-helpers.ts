import type { Principal } from './authorization.js';
import { hasPermission, assignedPatientIds } from './authorization.js';
import { db } from '../core/database.js';

/**
 * Shared scope helpers for modules that don't have their own
 * resolveXxxListScope function.
 *
 * Pattern:
 *   const scope = await resolveModuleScope(principal, 'module_name');
 *   if (scope.denied) return empty results;
 *   if (scope.branchIds) apply branch filter;
 *   if (scope.patientIds) apply patient filter;
 */

export interface ModuleScopeResult {
  /** If true, the query should return zero rows */
  denied: boolean;
  /** Branch IDs to filter by (undefined = all branches / tenant-wide) */
  branchIds?: string[];
  /** Patient IDs to filter by (undefined = all patients) */
  patientIds?: string[];
}

/**
 * Resolve scope for a module's list endpoint.
 *
 * Checks the principal's permission scope for the given module
 * and returns the appropriate filter criteria.
 *
 * @param principal - The authenticated user's principal
 * @param moduleName - The module name (e.g., 'home_visits', 'telemedicine')
 * @param permissionPrefix - The permission prefix (default: same as moduleName)
 */
export async function resolveModuleScope(
  principal: Principal,
  moduleName: string,
  permissionPrefix?: string,
): Promise<ModuleScopeResult> {
  const permPrefix = permissionPrefix || moduleName;
  const viewPerm = `${permPrefix}.view`;

  if (hasPermission(principal, viewPerm, 'system') || hasPermission(principal, viewPerm, 'tenant')) {
    return { denied: false };
  }
  if (hasPermission(principal, viewPerm, 'branch') || hasPermission(principal, viewPerm, 'branches')) {
    return { denied: false, branchIds: principal.branches };
  }
  if (hasPermission(principal, viewPerm, 'department') || hasPermission(principal, viewPerm, 'assigned_patients')) {
    return { denied: false, patientIds: await assignedPatientIds(principal) };
  }
  // No permission at this scope level → deny all
  return { denied: true, patientIds: [] };
}

/**
 * Apply patient-based scope filter to a query builder.
 * Filters through the patients table (which has branch_id and department_id).
 *
 * Usage:
 *   const scope = await resolveModuleScope(principal, 'home_visits');
 *   applyPatientScopeFilter(q, scope, 'home_visits.patient_id', 'patients.branch_id');
 */
export function applyPatientScopeFilter<T extends { where: Function; whereIn: Function }>(
  qb: T,
  scope: ModuleScopeResult,
  patientIdColumn: string,
  branchColumn?: string,
): T {
  if (scope.denied) {
    return qb.where(db.raw('false')) as T;
  }
  if (scope.branchIds !== undefined) {
    if (scope.branchIds.length === 0) {
      return qb.where(db.raw('false')) as T;
    }
    // Filter through patients table for branch
    if (branchColumn) {
      qb = qb.whereIn(branchColumn, scope.branchIds) as T;
    }
  }
  if (scope.patientIds !== undefined) {
    if (scope.patientIds.length === 0) {
      return qb.where(db.raw('false')) as T;
    }
    qb = qb.whereIn(patientIdColumn, scope.patientIds) as T;
  }
  return qb;
}
