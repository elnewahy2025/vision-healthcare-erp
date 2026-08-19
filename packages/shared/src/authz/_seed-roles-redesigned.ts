/**
 * REDESIGNED SEED ROLES — 39 system role templates
 * 
 * Every role has at least one unique permission or action combination
 * that no other role holds. Roles map to real hospital job functions.
 *
 * See docs/engineering/AUTHORIZATION-SOUND-OF-TRUTH.md §13.
 *
 * Key principles:
 * - approve/reject = senior authority (only supervisors+ have these)
 * - create/edit = operational work
 * - view = read-only
 * - manage = administrative control
 * - delete = destructive authority (rare, senior roles only)
 * - export = data extraction (controlled, financial/compliance roles)
 *
 * Scope alone does NOT distinguish roles. Each role must have
 * different ACTIONS or MODULES even at the same scope.
 */
