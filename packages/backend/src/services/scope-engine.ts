import type { Knex } from 'knex';
import type { Principal } from './authorization.js';
import { hasPermission } from './authorization.js';
import { assignedPatientIds } from './authorization.js';
import type { PermissionScope } from '@healthcare/shared/authz';

/**
 * Scope Engine per AUTHORIZATION-SOUND-OF-TRUTH.md §9, §14.
 *
 * Provides:
 * 1. resolveScope() — determines the effective scope for a permission
 * 2. Module-specific scope policies — translate scope levels into DB constraints
 * 3. scopeQuery() — applies the right constraints to a Knex query builder
 *
 * Every data-returning endpoint MUST use this engine.
 */

// ════════════════════════════════════════════════════════════════════
// 1. SCOPE RESOLUTION
// ════════════════════════════════════════════════════════════════════

const SCOPE_RANK: Record<PermissionScope, number> = {
  self: 0,
  assigned_patients: 1,
  department: 2,
  branch: 3,
  branches: 4,
  tenant: 5,
  system: 6,
};

/**
 * Resolve the effective scope for a permission on a principal.
 *
 * Finds all grants for the permission and returns the broadest scope
 * the principal holds. If no grant exists, returns null (denied).
 *
 * Examples:
 *   - Doctor with `patients.view@assigned_patients` → 'assigned_patients'
 *   - Admin with `patients.view@tenant` → 'tenant'
 *   - Super admin with `*` → 'system'
 */
export function resolveScope(
  principal: Principal,
  permission: string,
): PermissionScope | null {
  const grants = principal.grants.filter(
    (g) => g.permission === permission || g.permission === '*',
  );
  if (grants.length === 0) return null;

  // Return the broadest scope the principal holds
  let broadest: PermissionScope = 'self';
  for (const grant of grants) {
    if (SCOPE_RANK[grant.scope] > SCOPE_RANK[broadest]) {
      broadest = grant.scope;
    }
  }
  return broadest;
}

// ════════════════════════════════════════════════════════════════════
// 2. MODULE-SPECIFIC SCOPE POLICIES
// ════════════════════════════════════════════════════════════════════

/**
 * Scope policy interface. Each module implements this to translate
 * a scope level into query constraints on a Knex query builder.
 */
export interface ScopePolicy {
  /** The DB table name for this module (null for aggregate modules like reports) */
  table: string | null;
  /** Column name for tenant_id (default: 'tenant_id') */
  tenantColumn: string;
  /** Column name for branch_id (optional) */
  branchColumn?: string | null;
  /** Column name for department_id (optional) */
  departmentColumn?: string | null;
  /** Column name for assigned doctor/user (optional, for assigned_patients scope) */
  assignedColumn?: string | null;
  /** Column name for patient_id (optional, for self scope in patient portal) */
  patientColumn?: string | null;
  /** Which scope levels are valid for this module */
  validScopes: PermissionScope[];
  /** For assigned_patients scope: how to resolve patient IDs */
  patientResolver?: (principal: Principal) => Promise<string[]>;
}

/**
 * Default scope policies for all modules.
 *
 * Each module defines which scope levels it supports and which DB columns
 * to filter on. The engine applies the broadest valid scope.
 */
export const MODULE_SCOPE_POLICIES: Record<string, ScopePolicy> = {
  patients: {
    table: 'patients',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    departmentColumn: 'department_id',
    assignedColumn: 'created_by',
    patientColumn: 'id',
    validScopes: ['self', 'assigned_patients', 'department', 'branch', 'branches', 'tenant', 'system'],
    patientResolver: async (principal) => assignedPatientIds(principal),
  },
  appointments: {
    table: 'appointments',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    departmentColumn: null,
    assignedColumn: 'doctor_id',
    validScopes: ['self', 'assigned_patients', 'department', 'branch', 'branches', 'tenant', 'system'],
  },
  emr: {
    table: 'medical_records',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    departmentColumn: 'department_id',
    assignedColumn: 'doctor_id',
    validScopes: ['assigned_patients', 'department', 'branch', 'branches', 'tenant', 'system'],
  },
  billing: {
    table: 'invoices',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    validScopes: ['self', 'branch', 'branches', 'tenant', 'system'],
  },
  insurance: {
    table: 'insurance_claims',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    validScopes: ['branch', 'branches', 'tenant', 'system'],
  },
  insurance_claims: {
    table: 'insurance_claims',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    validScopes: ['branch', 'branches', 'tenant', 'system'],
  },
  hr: {
    table: 'employees',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    departmentColumn: 'department_id',
    validScopes: ['self', 'department', 'branch', 'branches', 'tenant', 'system'],
  },
  inventory: {
    table: 'inventory_items',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    departmentColumn: 'department_id',
    validScopes: ['department', 'branch', 'branches', 'tenant', 'system'],
  },
  pharmacy: {
    table: 'pharmacy_items',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    validScopes: ['branch', 'branches', 'tenant', 'system'],
  },
  laboratory: {
    table: 'lab_orders',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    departmentColumn: 'department_id',
    validScopes: ['department', 'branch', 'branches', 'tenant', 'system'],
  },
  radiology: {
    table: 'radiology_orders',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    departmentColumn: 'department_id',
    validScopes: ['department', 'branch', 'branches', 'tenant', 'system'],
  },
  audit: {
    table: 'audit_logs',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    validScopes: ['branch', 'branches', 'tenant', 'system'],
  },
  reports: {
    table: null, // Reports aggregate across modules
    tenantColumn: 'tenant_id',
    validScopes: ['branch', 'branches', 'tenant', 'system'],
  },
  queue: {
    table: 'queue_entries',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    validScopes: ['branch', 'branches', 'tenant', 'system'],
  },
  home_visits: {
    table: 'home_visits',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    assignedColumn: 'doctor_id',
    validScopes: ['assigned_patients', 'branch', 'branches', 'tenant', 'system'],
  },
  chat: {
    table: 'chat_conversations',
    tenantColumn: 'tenant_id',
    validScopes: ['self', 'tenant', 'system'],
  },
  communications: {
    table: 'communications',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    validScopes: ['branch', 'branches', 'tenant', 'system'],
  },
  automation: {
    table: 'automation_rules',
    tenantColumn: 'tenant_id',
    validScopes: ['tenant', 'system'],
  },
  users: {
    table: 'users',
    tenantColumn: 'tenant_id',
    branchColumn: 'branch_id',
    departmentColumn: 'department_id',
    validScopes: ['department', 'branch', 'branches', 'tenant', 'system'],
  },
  branches: {
    table: 'branches',
    tenantColumn: 'tenant_id',
    validScopes: ['tenant', 'system'],
  },
  departments: {
    table: 'departments',
    tenantColumn: 'tenant_id',
    validScopes: ['tenant', 'system'],
  },
  settings: {
    table: null,
    tenantColumn: 'tenant_id',
    validScopes: ['tenant', 'system'],
  },
};

// ════════════════════════════════════════════════════════════════════
// 3. QUERY BUILDER SCOPE APPLICATION
// ════════════════════════════════════════════════════════════════════

/**
 * Apply scope constraints to a Knex query builder based on a module's scope policy.
 *
 * Usage in a controller:
 *   const principal = getCtx(request).principal;
 *   const scope = resolveScope(principal, 'patients.view');
 *   const qb = db('patients');
 *   applyModuleScope(qb, principal, 'patients', scope);
 *   const results = await qb;
 */
export async function applyModuleScope<T extends Knex.QueryBuilder>(
  qb: T,
  principal: Principal,
  moduleName: string,
  scope: PermissionScope | null,
): Promise<T> {
  const policy = MODULE_SCOPE_POLICIES[moduleName];
  if (!policy) {
    // Unknown module — apply tenant filter only (safe default)
    qb.where('tenant_id', principal.tenantId);
    return qb;
  }

  if (!scope) {
    // No scope resolved — deny all rows
    qb.where(false);
    return qb;
  }

  // Validate scope is supported by this module
  if (!policy.validScopes.includes(scope)) {
    // Scope not valid for this module — fall back to tenant
    scope = 'tenant';
  }

  // Always apply tenant filter
  if (policy.tenantColumn) {
    qb.where(policy.tenantColumn, principal.tenantId);
  }

  // Apply scope-specific filters
  switch (scope) {
    case 'system':
      // System scope: no additional filter (super admin)
      break;

    case 'tenant':
      // Tenant scope: tenant filter is enough
      break;

    case 'branches':
    case 'branch':
      // Branch scope: filter to user's assigned branches
      if (policy.branchColumn && principal.branches.length > 0) {
        qb.whereIn(policy.branchColumn, principal.branches);
      } else if (policy.branchColumn && principal.branchId) {
        qb.where(policy.branchColumn, principal.branchId);
      } else if (policy.branchColumn) {
        qb.where(false); // No branch assigned → no rows
      }
      break;

    case 'department':
      // Department scope: filter to user's department
      if (policy.departmentColumn && principal.departmentId) {
        qb.where(policy.departmentColumn, principal.departmentId);
      } else if (policy.departmentColumn) {
        qb.where(false); // No department assigned → no rows
      }
      break;

    case 'assigned_patients':
      // Assigned patients scope: filter to patients assigned to this user
      if (policy.assignedColumn) {
        qb.where(policy.assignedColumn, principal.userId);
      } else if (policy.patientResolver) {
        const patientIds = await policy.patientResolver(principal);
        if (patientIds.length > 0 && policy.patientColumn) {
          qb.whereIn(policy.patientColumn, patientIds);
        } else {
          qb.where(false); // No assigned patients → no rows
        }
      } else {
        qb.where(false);
      }
      break;

    case 'self':
      // Self scope: user's own data only (patient portal)
      if (policy.patientColumn) {
        qb.where(policy.patientColumn, principal.userId);
      } else {
        qb.where(false);
      }
      break;
  }

  return qb;
}

/**
 * Convenience function: resolve scope + apply to query builder in one call.
 *
 * Usage:
 *   await scopedQuery(db('patients'), principal, 'patients', 'patients.view');
 */
export async function scopedQuery<T extends Knex.QueryBuilder>(
  qb: T,
  principal: Principal,
  moduleName: string,
  permission: string,
): Promise<T> {
  const scope = resolveScope(principal, permission);
  return applyModuleScope(qb, principal, moduleName, scope);
}
