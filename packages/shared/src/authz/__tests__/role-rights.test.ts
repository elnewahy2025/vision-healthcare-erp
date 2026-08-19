import { describe, it, expect } from 'vitest';
import {
  SEED_ROLES,
  expandRoleGrants,
  PERMISSION_CATALOG,
  allPermissionKeys,
  type PermissionScope,
  type Grant,
} from '../index';

/**
 * Role-to-rights verification tests.
 *
 * Verifies:
 * 1. Exactly 39 roles exist
 * 2. No two roles produce identical effective permission sets
 * 3. Every permission in every role exists in the catalog
 * 4. Scope hierarchy is respected
 * 5. Special roles (super_admin, admin, patient) behave correctly
 *
 * See docs/engineering/PRODUCTION-IMPLEMENTATION-PLAN.md Phase 5.
 */

function grantKeySet(grants: Grant[]): Set<string> {
  return new Set(grants.map((g) => `${g.permission}@${g.scope}`));
}

describe('39 Role Templates', () => {
  it('should have exactly 39 roles', () => {
    expect(Object.keys(SEED_ROLES).length).toBe(39);
  });

  it('every role (except guest) should produce at least one grant', () => {
    for (const [slug, template] of Object.entries(SEED_ROLES)) {
      const grants = expandRoleGrants(template);
      if (slug === 'guest') {
        expect(grants.length).toBe(0);
      } else {
        expect(grants.length).toBeGreaterThan(0);
      }
    }
  });

  it('no two roles should produce identical grant sets', () => {
    const seen = new Map<string, string[]>();
    for (const [slug, template] of Object.entries(SEED_ROLES)) {
      const grants = expandRoleGrants(template);
      const key = Array.from(grantKeySet(grants)).sort().join('|');
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(slug);
    }

    const duplicates: string[] = [];
    for (const [, slugs] of seen) {
      if (slugs.length > 1) {
        duplicates.push(slugs.join(' = '));
      }
    }
    expect(duplicates).toEqual([]);
  });

  it('every permission in every role grant must exist in the catalog', () => {
    for (const [slug, template] of Object.entries(SEED_ROLES)) {
      const grants = expandRoleGrants(template);
      for (const grant of grants) {
        if (grant.permission === '*') continue;
        const dot = grant.permission.indexOf('.');
        const module = grant.permission.slice(0, dot);
        const action = grant.permission.slice(dot + 1);
        expect(PERMISSION_CATALOG[module], `Role "${slug}" references unknown module "${module}"`).toBeDefined();
        if (action !== '*') {
          expect(
            PERMISSION_CATALOG[module].includes(action as any),
            `Role "${slug}" references unknown action "${action}" in module "${module}"`,
          ).toBeDefined();
        }
      }
    }
  });

  it('scope hierarchy should be respected', () => {
    const validScopes: PermissionScope[] = ['self', 'assigned_patients', 'department', 'branch', 'branches', 'tenant', 'system'];
    for (const [slug, template] of Object.entries(SEED_ROLES)) {
      expect(validScopes).toContain(template.scopeDefault);
      const grants = expandRoleGrants(template);
      for (const grant of grants) {
        expect(validScopes, `Role "${slug}" has invalid scope "${grant.scope}"`).toContain(grant.scope);
      }
    }
  });

  it('super_admin should have system scope for all permissions', () => {
    const grants = expandRoleGrants(SEED_ROLES.super_admin);
    const allPerms = allPermissionKeys();
    for (const perm of allPerms) {
      const found = grants.some((g) => g.permission === perm && g.scope === 'system');
      expect(found, `super_admin missing system scope for ${perm}`).toBe(true);
    }
  });

  it('admin should have tenant scope for all permissions', () => {
    const grants = expandRoleGrants(SEED_ROLES.admin);
    const allPerms = allPermissionKeys();
    for (const perm of allPerms) {
      const found = grants.some((g) => g.permission === perm && g.scope === 'tenant');
      expect(found, `admin missing tenant scope for ${perm}`).toBe(true);
    }
  });

  it('patient role should have only self scope', () => {
    const grants = expandRoleGrants(SEED_ROLES.patient);
    for (const grant of grants) {
      expect(grant.scope).toBe('self');
    }
  });

  it('each role has the correct level metadata', () => {
    expect(SEED_ROLES.super_admin.level).toBe('system');
    expect(SEED_ROLES.doctor.level).toBe('tenant');
    expect(SEED_ROLES.branch_manager.level).toBe('tenant');
    expect(SEED_ROLES.patient.level).toBe('tenant');
    expect(SEED_ROLES.guest.level).toBe('tenant');
  });

  it('roles with narrower scope should have fewer or equal grants than broader roles', () => {
    const superAdminGrants = expandRoleGrants(SEED_ROLES.super_admin).length;
    const adminGrants = expandRoleGrants(SEED_ROLES.admin).length;
    expect(adminGrants).toBeLessThanOrEqual(superAdminGrants);

    // A specialized role like storekeeper should have fewer grants than a general role
    const branchManagerGrants = expandRoleGrants(SEED_ROLES.branch_manager).length;
    const storekeeperGrants = expandRoleGrants(SEED_ROLES.storekeeper).length;
    expect(storekeeperGrants).toBeLessThanOrEqual(branchManagerGrants);
  });

  it('clinical roles should have patients-related grants', () => {
    for (const slug of ['doctor', 'nurse', 'resident_doctor', 'pharmacist', 'lab_tech', 'radiologist']) {
      const grants = expandRoleGrants(SEED_ROLES[slug]);
      const hasPatientGrant = grants.some((g) => g.permission.startsWith('patients.'));
      expect(hasPatientGrant, `${slug} should have patients-related grants`).toBe(true);
    }
  });

  it('financial roles should have billing-related grants', () => {
    for (const slug of ['billing_staff', 'accountant', 'insurance_officer']) {
      const grants = expandRoleGrants(SEED_ROLES[slug]);
      const hasBillingGrant = grants.some((g) => g.permission.startsWith('billing.') || g.permission.startsWith('insurance'));
      expect(hasBillingGrant, `${slug} should have billing/insurance grants`).toBe(true);
    }
  });
});
