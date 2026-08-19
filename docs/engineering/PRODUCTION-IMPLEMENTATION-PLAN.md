# Hospital ERP — Production Implementation Plan

> **Purpose:** Phased implementation to close all critical gaps between the current
> state and production readiness. Every phase is independently deployable and testable.
> No phase breaks existing functionality.

---

## Executive Summary

The authorization architecture (JWT + Membership + Principal + Cache + Permission Versioning) is solid and must not be changed. The gap is in **enforcement**: the scope engine exists but is not called by any module, the `<Can>` component exists but is not used in any page, and the seed data uses a legacy permission format.

---

## Phase 1: Seed Data + Role Template Migration

**Goal:** Fix broken seed data so new deployments get proper RBAC.

**Risk:** Zero — only affects seed/migration, not runtime code.

### Changes:
1. Rewrite `packages/backend/seeds/001_demo_data.ts` to use current `patients.view` format
2. Create migration `043_seed_39_role_templates.ts` that:
   - Deletes legacy roles with old-format permissions
   - Seeds all 39 system role templates into the `roles` table
   - Seeds their permissions into `role_permissions` table
   - Creates a demo user with `super_admin` role
   - Creates memberships for the demo user

### Verification:
- Run `npx knex migrate:latest` on a fresh DB
- Login as demo admin → verify 39 roles visible in RBAC page
- Verify permissions match the catalog

---

## Phase 2: Scope Engine Integration (Critical Security Fix)

**Goal:** Every data-returning endpoint applies scope filtering via the scope engine.

**Risk:** Low — scope engine is already tested. We add calls to existing queries.
**Approach:** Module-by-module, starting with highest-risk (patients, billing, HR).

### Pattern:
Every controller that lists/searches data currently does:
```typescript
const rows = await db('table').where('tenant_id', tenantId);
```

Must become:
```typescript
import { scopedQuery } from '../../services/scope-engine.js';
const rows = await scopedQuery(
  db('table'), principal, 'moduleName', 'module.view'
);
```

### Module Groups:

**Group A — Clinical (highest risk):**
- `patient/patient.routes.ts` — patient list/search
- `appointment/appointment.routes.ts` — appointment list
- `emr/index.ts` — EMR records
- `laboratory/index.ts` — lab orders/results
- `radiology/index.ts` — radiology orders
- `pharmacy/index.ts` — prescriptions
- `nursing/index.ts` — nursing assignments

**Group B — Financial:**
- `billing/index.ts` — invoices, payments
- `insurance/index.ts` — insurance policies
- `insurance-claims/index.ts` — claims
- `inventory/index.ts` — stock items
- `hr/index.ts` — employees
- `financial-deepening/index.ts` — financial reports

**Group C — Administrative:**
- `users/index.ts` — user list
- `departments/index.ts` — department list
- `audit/index.ts` — audit logs
- `reports/index.ts` — reports
- `automation/index.ts` — automation rules
- `compliance/index.ts` — compliance records
- `chat/index.ts` — conversations
- `communications/index.ts` — communications
- `notification/index.ts` — notifications

**Group D — Platform:**
- `regions/index.ts` — regions
- `multi-branch/index.ts` — branches
- `saas-billing/index.ts` — SaaS billing
- `white-label/index.ts` — white label
- `dr-backup/index.ts` — backups
- `system-monitor/index.ts` — system monitor

### Verification:
- Login as doctor → verify only assigned patients visible
- Login as nurse → verify only department patients visible
- Login as admin → verify all tenant data visible
- Login as branch_manager → verify only branch data visible

---

## Phase 3: Frontend Permission Gating

**Goal:** Every page uses `<Can>` to hide/show buttons, actions, and sections.

**Risk:** Zero — only affects UI visibility, not data access.

### Pattern:
Every page component currently shows all buttons unconditionally.
Must wrap action buttons/sections in `<Can>`:

```tsx
<Can permission="patients.create">
  <Button onClick={handleCreate}>Add Patient</Button>
</Can>

<Can permission="patients.export">
  <Button onClick={handleExport}>Export</Button>
</Can>
```

### Pages to update (88 pages):
Starting with highest-traffic pages:
1. DashboardPage — widget visibility
2. PatientsPage — create, edit, delete, export buttons
3. AppointmentsPage — create, cancel, edit buttons
4. EmrPage — create, edit, approve buttons
5. BillingPage — create, edit, delete, export buttons
6. LaboratoryPage — create, approve buttons
7. RadiologyPage — create, approve buttons
8. PharmacyPage — create, dispense buttons
9. InventoryPage — create, edit, delete buttons
10. HrPage — create, edit, delete buttons
... (all 88 pages)

### Verification:
- Login as doctor → verify no billing, HR, inventory buttons visible
- Login as receptionist → verify no clinical action buttons visible
- Login as admin → verify all buttons visible

---

## Phase 4: Test Infrastructure Fix

**Goal:** All tests pass. Add integration tests for scope enforcement.

### Changes:
1. Fix `packages/frontend/vitest.config.ts` — add jsdom environment
2. Fix `packages/frontend/src/__tests__/usePatients.test.ts` — 9 failing tests
3. Add scope engine integration tests:
   - Test `resolveScope()` returns correct scope for each role
   - Test `applyModuleScope()` applies correct WHERE clauses
   - Test `scopedQuery()` end-to-end with mock DB
4. Add role-to-rights matrix test:
   - Verify every role template produces unique effective permissions
   - Verify no two roles are identical
   - Verify wildcard expansion works correctly

### Verification:
- `npx vitest run` → 0 failures

---

## Phase 5: Role-to-Rights Verification + Documentation

**Goal:** Every role is provably distinct. Documentation is complete.

### Changes:
1. Generate a role-to-rights matrix (CSV/markdown) from `SEED_ROLES`
2. Add a test that verifies each role has at least one unique (permission, scope) pair
3. Update `AUTHORIZATION-SOUND-OF-TRUTH.md` with final state
4. Add API documentation for all RBAC endpoints

---

## Non-Negotiable Rules During Implementation

1. **Do not modify existing working routes or their request/response shapes**
2. **Do not change JWT payload structure**
3. **Do not change the Principal interface**
4. **Do not hardcode tenant IDs, passwords, or configuration**
5. **Do not remove existing features**
6. **Every change must compile cleanly** (`npx tsc --noEmit`)
7. **Every existing test must continue to pass**
8. **Each phase must be independently deployable**

---

## Rollback Plan

Each phase has a single migration or code change:
- Phase 1: Reverse migration `down()` deletes seeded roles
- Phase 2: Remove `scopedQuery` calls (queries revert to tenant-only filtering)
- Phase 3: Remove `<Can>` wrappers (buttons become visible again)
- Phase 4: Test-only changes (no rollback needed)
- Phase 5: Documentation-only (no rollback needed)

---

## Success Criteria

After all phases complete:
- [ ] `npx tsc --noEmit` → 0 errors (all packages)
- [ ] `npx vitest run` → 0 failures
- [ ] Scope engine called by every data-returning module
- [ ] `<Can>` used in every page for action buttons
- [ ] Seed data produces working RBAC for all 39 roles
- [ ] Doctor login sees only assigned patients
- [ ] Nurse login sees only department patients
- [ ] Admin sees all tenant data
- [ ] Branch manager sees only branch data
- [ ] No legacy permission format in database
