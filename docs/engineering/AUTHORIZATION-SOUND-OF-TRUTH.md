# Hospital ERP — Authorization: Sound of Truth

> **Purpose:** This is the single implementation reference for the RBAC
> architecture. It maps every architectural decision to exact file changes,
> database migrations, API contracts, and testable outcomes. Any code written
> for this system MUST conform to this document.
>
> **Companion doc:** `AUTHORIZATION-ARCHITECTURE.md` covers the conceptual
> architecture. This document covers the implementation reality.

---

## Table of Contents

1. [Current State (What Exists Today)](#1-current-state)
2. [Target State (What We Are Building)](#2-target-state)
3. [The Gap Map](#3-the-gap-map)
4. [Database Schema — Exact DDL](#4-database-schema)
5. [JWT Contract — Before & After](#5-jwt-contract)
6. [Backend Module Changes — File by File](#6-backend-module-changes)
7. [Frontend Authorization — Components & Hooks](#7-frontend-authorization)
8. [API Contract Changes](#8-api-contract-changes)
9. [Cache Strategy — Implementation](#9-cache-strategy)
10. [Migration Safety Plan](#10-migration-safety-plan)
11. [Test Plan — Per Phase](#11-test-plan)
12. [Rollback Procedures](#12-rollbacks)
13. [The 39 Roles — Full Permission Matrix](#13-role-matrix)
14. [Scope Policies — Per Module](#14-scope-policies)
15. [Non-Negotiable Rules](#15-non-negotiable-rules)

---

## 1. Current State

### 1.1 Database Tables That Exist

| Table | Purpose | Status |
|-------|---------|--------|
| `tenants` | Organization boundaries | ✅ Exists |
| `users` | User accounts, `tenant_id` FK | ✅ Exists |
| `roles` | Role definitions, `tenant_id` FK | ✅ Exists |
| `user_roles` | User ↔ Role mapping | ✅ Exists (migration 033) |
| `role_permissions` | Role ↔ Permission+Scope | ✅ Exists (migration 033) |
| `user_permissions` | Direct user grants | ✅ Exists (migration 033) |
| `user_branches` | User ↔ Branch mapping | ✅ Exists (migration 033) |
| `departments` | Per-tenant departments | ✅ Exists (migration 033) |
| `memberships` | User ↔ Tenant/Branch/Dept context | ❌ DOES NOT EXIST |
| `user_sessions` | Refresh tokens | ✅ Exists |

### 1.2 Current JWT Payload

```json
{
  "tenantId": "uuid",
  "userId": "uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Problem:** `tenantId` is in the JWT. The token itself determines tenant context.
This means if a user has access to multiple tenants, the JWT locks them to one.

### 1.3 Current `loadUserPrincipal()`

Located in `packages/backend/src/services/authorization.ts`.

Takes `(userId, tenantId)` — tenantId comes from JWT claims.

Queries:
- `users` WHERE id = userId AND tenant_id = tenantId
- `user_roles` + `roles` for role slugs
- `role_permissions` for role grants
- `user_permissions` for direct grants
- `user_branches` for branch assignments

Returns `Principal` with: id, tenantId, roles[], grants[], branches[], departmentId, locale, permVersion, status.

### 1.4 Current `authorize()` Middleware

```typescript
authorize(permission: string, requestedScope?: PermissionScope)
```

Checks `hasPermission(principal, permission, requestedScope)`.

### 1.5 Current `getCtx()` / `getTenantId()`

```typescript
// route-helper.ts
export function getCtx(request) { return request.ctx!; }
export function getTenantId(request) { return request.tenantId || getCtx(request).tenantId; }
```

The `ctx` is populated by Fastify's `authenticate` decorator which loads the JWT
and calls `loadUserPrincipal(userId, tenantId)`.

### 1.6 Current Permission Catalog

Located in `packages/shared/src/authz/index.ts`.

- 55+ modules with defined actions
- `PERMISSION_CATALOG`: module → actions[]
- `SEED_ROLES`: 15 role templates (super_admin, admin, doctor, nurse, receptionist, pharmacist, lab_tech, radiologist, billing_staff, accountant, manager, patient + more)
- `expandRoleGrants()`: Expands wildcards into concrete permission:scope pairs
- `expandGrantKey()`: Expands `module.*` into individual `module.action` keys

### 1.7 Current Seed Roles (15)

```
super_admin, admin, doctor, nurse, receptionist, pharmacist,
lab_tech, radiologist, billing_staff, accountant, manager,
patient (+ a few more in the codebase)
```

---

## 2. Target State

### 2.1 The Authorization Flow (Final)

```
┌─────────────────────────────────────────────────────────────────────┐
│ REQUEST ARRIVES                                                      │
│ JWT contains: { sub: user_id, mid: membership_id, sid: session_id, │
│                 authz_version: N }                                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    1. AUTHENTICATE  │
                    │ Verify JWT signature│
                    │ Verify expiry       │
                    │ Verify session alive│
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  2. LOAD MEMBERSHIP │
                    │ From Redis cache or │
                    │ DB: tenant_id,      │
                    │ branch_id, dept_id, │
                    │ status, roles[]     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────────┐
                    │ 3. CHECK AUTHZ_VERSION  │
                    │ JWT.authz_version       │
                    │ vs DB.authz_version     │
                    │ If mismatch → reload    │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │ 4. LOAD EFFECTIVE AUTH  │
                    │ From Redis cache or DB: │
                    │ Role grants             │
                    │ + Direct grants         │
                    │ − Explicit denials      │
                    │ = Effective permissions │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │ 5. authorize() GATEWAY  │
                    │ Does the user have the  │
                    │ requested permission?   │
                    │ Does the grant's scope  │
                    │ cover the request?      │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │ 6. MODULE SCOPE POLICY  │
                    │ Translate scope level   │
                    │ into DB WHERE clause    │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │ 7. SCOPED DB QUERY      │
                    │ PostgreSQL receives     │
                    │ tenant_id + scope       │
                    │ constraints             │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │ 8. RESULT SET           │
                    │ Only authorized rows    │
                    └─────────────────────────┘
```

### 2.2 Final JWT Payload

```typescript
interface AccessTokenPayload {
  sub: string;          // user_id (subject)
  mid: string;          // active_membership_id
  sid: string;          // session_id
  authz_version: number; // authorization version for staleness detection
  iat: number;
  exp: number;
}
```

**What is NEVER in the JWT:**
- tenant_id
- branch_id
- department_id
- roles
- permissions
- scopes
- locale

### 2.3 Final Principal (Resolved Server-Side)

```typescript
interface Principal {
  kind: 'user' | 'patient';
  userId: string;
  membershipId: string;
  tenantId: string;          // from membership
  branchId: string | null;   // from membership
  departmentId: string | null; // from membership
  roles: string[];           // from user_roles via membership
  grants: Grant[];           // effective grants (role + direct − denials)
  locale: 'ar' | 'en';
  authzVersion: number;
  status: string;            // 'active' | 'suspended' | ...
  membershipStatus: string;  // 'active' | 'suspended' | ...
}
```

### 2.4 Final Database Schema

```
memberships (NEW)
├── id: UUID PK
├── user_id: UUID FK(users.id)
├── tenant_id: UUID FK(tenants.id)
├── branch_id: UUID FK(branches.id) NULLABLE
├── department_id: UUID FK(departments.id) NULLABLE
├── status: VARCHAR(20) DEFAULT 'active'
├── authz_version: INTEGER DEFAULT 1
├── created_at: TIMESTAMP
├── updated_at: TIMESTAMP
└── UNIQUE(user_id, tenant_id, branch_id)

user_permissions (ADD COLUMN)
├── type: VARCHAR(10) DEFAULT 'allow'  ← NEW: 'allow' | 'deny'
```

---

## 3. The Gap Map

### What MUST change vs what stays:

| Component | Current State | Action Required |
|-----------|--------------|-----------------|
| `memberships` table | Does not exist | **CREATE** (migration 042) |
| `user_permissions.type` | No deny support | **ADD** column (migration 042) |
| `users.perm_version` | Exists but unused | **MOVE** to `memberships.authz_version` |
| JWT signing | Contains `tenantId` | **REFACTOR** to `sub`/`mid`/`sid`/`authz_version` |
| JWT verification | Extracts `tenantId` from JWT | **REFACTOR** to extract `sub`/`mid` only |
| `loadUserPrincipal()` | Takes `(userId, tenantId)` | **REFACTOR** to take `(userId, membershipId)` |
| `getCtx()` | Populated from JWT `tenantId` | **REFACTOR** to resolve from membership |
| `getTenantId()` | Falls back to JWT `tenantId` | **REFACTOR** to always resolve from membership |
| `hasPermission()` | No deny support | **ADD** deny resolution |
| `scopeQuery()` | Basic tenant + branch filter | **ENHANCE** with module-specific policies |
| Login endpoint | Returns JWT with tenantId | **REFACTOR** to return memberships list, accept membership selection |
| Frontend auth context | Reads permissions from JWT/user response | **CREATE** AuthorizationProvider |
| Sidebar | Static menu | **REFACTOR** to permission-driven `filterMenu()` |
| Cache | None | **CREATE** Redis cache for auth context |
| Cache invalidation | None | **CREATE** invalidation on role/permission/membership change |
| Permission versioning | Column exists, logic missing | **IMPLEMENT** version check on each request |

---

## 4. Database Schema — Exact DDL

### Migration 042: Memberships + Deny Support

```typescript
// packages/backend/migrations/042_memberships.ts

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Memberships table ──
  if (!(await knex.schema.hasTable('memberships'))) {
    await knex.schema.createTable('memberships', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.uuid('tenant_id').notNullable()
        .references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('branch_id').nullable()
        .references('id').inTable('branches').onDelete('SET NULL');
      table.uuid('department_id').nullable()
        .references('id').inTable('departments').onDelete('SET NULL');
      table.string('status', 20).notNullable().defaultTo('active');
      table.integer('authz_version').notNullable().defaultTo(1);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'tenant_id', 'branch_id']);
      table.index(['user_id']);
      table.index(['tenant_id']);
      table.index(['status']);
    });
  }

  // ── Backfill memberships from existing user-tenant assignments ──
  const users = await knex('users')
    .select('id', 'tenant_id', 'branch_id', 'department_id', 'status')
    .whereNotNull('tenant_id');

  for (const user of users) {
    const exists = await knex('memberships')
      .where({
        user_id: user.id,
        tenant_id: user.tenant_id,
        branch_id: user.branch_id || null,
      })
      .first();
    if (!exists) {
      await knex('memberships').insert({
        user_id: user.id,
        tenant_id: user.tenant_id,
        branch_id: user.branch_id || null,
        department_id: user.department_id || null,
        status: user.status || 'active',
        authz_version: user.perm_version || 1,
      });
    }
  }

  // ── Add 'type' column to user_permissions for allow/deny ──
  if (!(await knex.schema.hasColumn('user_permissions', 'type'))) {
    await knex.schema.alterTable('user_permissions', (table) => {
      table.string('type', 10).notNullable().defaultTo('allow');
    });
  }

  // ── Add active_membership_id to users (for quick lookup) ──
  if (!(await knex.schema.hasColumn('users', 'active_membership_id'))) {
    await knex.schema.alterTable('users', (table) => {
      table.uuid('active_membership_id').nullable()
        .references('id').inTable('memberships').onDelete('SET NULL');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('active_membership_id');
  });
  await knex.schema.alterTable('user_permissions', (table) => {
    table.dropColumn('type');
  });
  await knex.schema.dropTableIfExists('memberships');
}
```

### Key Schema Rules

1. **One user can have multiple memberships** (multi-tenant, multi-branch).
2. **`active_membership_id`** on `users` points to the currently selected membership.
3. **`authz_version`** on membership increments when roles/permissions change.
4. **`user_permissions.type`** is `'allow'` or `'deny'`. Denials override allows.
5. **Unique constraint** on `(user_id, tenant_id, branch_id)` prevents duplicate memberships.

---

## 5. JWT Contract — Before & After

### Before (Current)

```typescript
// auth.service.ts — buildAccessTokenPayload()
function buildAccessTokenPayload(tenantId: string, userId: string) {
  return { tenantId, userId };
}
```

### After (Target)

```typescript
// auth.service.ts — buildAccessTokenPayload()
function buildAccessTokenPayload(
  userId: string,
  membershipId: string,
  sessionId: string,
  authzVersion: number,
) {
  return {
    sub: userId,            // user ID (subject)
    mid: membershipId,      // active membership ID
    sid: sessionId,         // session ID
    authz_version: authzVersion,
  };
}
```

### JWT Verification Changes

```typescript
// Before: extracts tenantId from JWT
const { tenantId, userId } = app.jwt.verify(token);

// After: extracts membership reference from JWT
const { sub: userId, mid: membershipId, sid: sessionId, authz_version } =
  app.jwt.verify(token);
// Then loads tenant/branch/dept from membership table
```

---

## 6. Backend Module Changes — File by File

### 6.1 `packages/backend/src/services/authorization.ts`

**Changes required:**

```typescript
// ── Principal interface (UPDATE) ──
export interface Principal {
  kind: 'user' | 'patient';
  userId: string;             // RENAMED from 'id'
  membershipId: string;       // NEW
  tenantId: string;           // comes from membership, NOT JWT
  branchId: string | null;    // comes from membership
  departmentId: string | null; // comes from membership
  roles: string[];
  grants: Grant[];            // effective (role + direct − denials)
  locale: 'ar' | 'en';
  authzVersion: number;
  status: string;
  membershipStatus: string;
}

// ── loadUserPrincipal (REWRITE) ──
// Before: loadUserPrincipal(userId, tenantId)
// After:  loadUserPrincipal(userId, membershipId)
export async function loadUserPrincipal(
  userId: string,
  membershipId: string,
): Promise<Principal | null> {
  // 1. Load membership
  const membership = await db('memberships')
    .where({ id: membershipId, user_id: userId, status: 'active' })
    .first();
  if (!membership) return null;

  // 2. Load user
  const user = await db('users')
    .where({ id: userId, tenant_id: membership.tenant_id })
    .first();
  if (!user || user.status !== 'active') return null;

  // 3. Load roles via user_roles
  const roleRows = await db('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('user_roles.user_id', userId)
    .andWhere('user_roles.tenant_id', membership.tenant_id)
    .select('roles.slug');

  // 4. Load role grants
  const roleGrantRows = await db('role_permissions')
    .join('user_roles', 'role_permissions.role_id', 'user_roles.role_id')
    .where('user_roles.user_id', userId)
    .andWhere('user_roles.tenant_id', membership.tenant_id)
    .select('role_permissions.permission', 'role_permissions.scope');

  // 5. Load direct grants (allow)
  const directGrantRows = await db('user_permissions')
    .where({
      user_id: userId,
      tenant_id: membership.tenant_id,
      type: 'allow',         // ← NEW: only allow grants
    })
    .select('permission', 'scope');

  // 6. Load explicit denials ← NEW
  const denialRows = await db('user_permissions')
    .where({
      user_id: userId,
      tenant_id: membership.tenant_id,
      type: 'deny',
    })
    .select('permission', 'scope');

  // 7. Build effective grants (allow − deny)
  const allowGrants: Grant[] = [
    ...roleGrantRows.map(r => ({
      permission: String(r.permission),
      scope: String(r.scope) as PermissionScope,
    })),
    ...directGrantRows.map(r => ({
      permission: String(r.permission),
      scope: String(r.scope) as PermissionScope,
    })),
  ];

  const deniedPermissions = new Set(denialRows.map(r => String(r.permission)));
  const grants = allowGrants.filter(g => !deniedPermissions.has(g.permission));

  // 8. Load branch assignments
  const branchRows = await db('user_branches')
    .where({ user_id: userId, tenant_id: membership.tenant_id })
    .select('branch_id');

  return {
    kind: 'user',
    userId,
    membershipId: membership.id,
    tenantId: membership.tenant_id,
    branchId: membership.branch_id,
    departmentId: membership.department_id,
    roles: roleRows.map(r => String(r.slug)),
    grants,
    locale: user.locale === 'ar' ? 'ar' : 'en',
    authzVersion: membership.authz_version,
    status: String(user.status || 'active'),
    membershipStatus: String(membership.status || 'active'),
  };
}

// ── hasPermission (UPDATE for denials) ──
export function hasPermission(
  principal: Principal,
  permission: string,
  requestedScope?: PermissionScope,
): boolean {
  // Effective grants already exclude denials (filtered in loadUserPrincipal)
  const candidates = principal.grants.filter(
    g => g.permission === '*' || g.permission === permission,
  );
  if (candidates.length === 0) return false;
  if (!requestedScope) return true;
  return candidates.some(g => scopeCovers(g.scope, requestedScope));
}
```

### 6.2 `packages/backend/src/modules/auth/auth.service.ts`

**Changes required:**

```typescript
// ── buildAccessTokenPayload (REWRITE) ──
export function buildAccessTokenPayload(
  userId: string,
  membershipId: string,
  sessionId: string,
  authzVersion: number,
): Record<string, unknown> {
  return { sub: userId, mid: membershipId, sid: sessionId, authz_version: authzVersion };
}

// ── generateAccessToken (UPDATE signature) ──
export function generateAccessToken(
  jwt: JwtHelper,
  userId: string,
  membershipId: string,
  sessionId: string,
  authzVersion: number,
): string {
  return jwt.sign(
    buildAccessTokenPayload(userId, membershipId, sessionId, authzVersion),
    { expiresIn: env.ACCESS_TOKEN_EXPIRY },
  );
}
```

### 6.3 `packages/backend/src/modules/auth/auth.controller.ts`

**Changes required in `login()`:**

```typescript
// ── Login flow (REWRITE) ──
export async function login(request, reply) {
  // ... existing validation ...

  // 1. Find tenant + user (same as now)
  const tenant = await repo.findTenantBySlug(body.tenantSlug);
  const user = await repo.findUserByEmailAndTenant(body.email, tenant.id);
  // ... password check, MFA check ...

  // 2. Load user's memberships (NEW)
  const memberships = await db('memberships')
    .where({ user_id: user.id, status: 'active' })
    .join('tenants', 'memberships.tenant_id', 'tenants.id')
    .leftJoin('branches', 'memberships.branch_id', 'branches.id')
    .leftJoin('departments', 'memberships.department_id', 'departments.id')
    .select(
      'memberships.id', 'memberships.tenant_id', 'memberships.branch_id',
      'memberships.department_id', 'memberships.authz_version',
      'tenants.name as tenant_name', 'tenants.slug as tenant_slug',
      'branches.name as branch_name',
      'departments.name as department_name',
    );

  if (memberships.length === 0) {
    throw new UnauthorizedError('No active memberships found');
  }

  // 3. If user has active_membership_id, use that; otherwise first membership
  const activeMembership = memberships.find(
    m => m.id === user.active_membership_id,
  ) || memberships[0];

  // 4. Create session
  const sessionId = crypto.randomUUID();
  const { refreshToken } = await generateTokenPair(
    user.id, activeMembership.tenant_id, ip, userAgent,
  );
  await createSessionRecord(
    activeMembership.tenant_id, user.id, refreshToken, ip, userAgent,
  );

  // 5. Generate JWT with membership reference (NOT tenant data)
  const accessToken = svc.generateAccessToken(
    jwt, user.id, activeMembership.id, sessionId,
    activeMembership.authz_version,
  );

  // 6. Load principal from membership (NOT from JWT)
  const principal = await loadUserPrincipal(user.id, activeMembership.id);

  // 7. Update user's active membership
  await db('users').where({ id: user.id }).update({
    active_membership_id: activeMembership.id,
    last_login_at: new Date(),
  });

  // 8. Return response
  return sendSuccess(reply, {
    accessToken,
    csrfToken,
    expiresIn: 3600,
    memberships: memberships.map(m => ({
      id: m.id,
      tenant: { id: m.tenant_id, name: m.tenant_name, slug: m.tenant_slug },
      branch: m.branch_id ? { id: m.branch_id, name: m.branch_name } : null,
      department: m.department_id ? { id: m.department_id, name: m.department_name } : null,
      authzVersion: m.authz_version,
    })),
    activeMembershipId: activeMembership.id,
    user: buildUserResponse(user, principal),
  });
}

// ── NEW: Switch Membership endpoint ──
export async function switchMembership(request, reply) {
  const { membershipId } = request.body;
  const userId = getCtx(request).userId;

  // 1. Verify user owns this membership
  const membership = await db('memberships')
    .where({ id: membershipId, user_id: userId, status: 'active' })
    .first();
  if (!membership) throw new ForbiddenError('Membership not found');

  // 2. Update active membership
  await db('users').where({ id: userId }).update({
    active_membership_id: membershipId,
  });

  // 3. Load new principal
  const principal = await loadUserPrincipal(userId, membershipId);

  // 4. Issue new JWT with new membership
  const sessionId = crypto.randomUUID();
  const accessToken = svc.generateAccessToken(
    jwt, userId, membershipId, sessionId, membership.authz_version,
  );

  // 5. Return new tokens
  return sendSuccess(reply, {
    accessToken,
    expiresIn: 3600,
    activeMembershipId: membershipId,
    user: buildUserResponse(/* ... */, principal),
  });
}
```

### 6.4 `packages/backend/src/modules/auth/auth.routes.ts`

**Add new route:**

```typescript
// POST /auth/switch-membership
app.post('/switch-membership', {
  preHandler: [authenticate],
  handler: switchMembership,
});
```

### 6.5 `packages/backend/src/modules/auth-guard.ts`

**No changes needed** — it just calls `server.authenticate()` which is set up
by `@fastify/jwt`. The important change is in how the authenticate decorator
is configured.

### 6.6 `packages/backend/src/utils/route-helper.ts`

**No changes needed** — `getCtx()` and `getTenantId()` already read from
`request.ctx`, which is populated by the authenticate decorator. The populate
logic changes in the auth module, not in route-helper.

### 6.7 Fastify JWT Decorator Setup

The `authenticate` decorator (set up in the Fastify plugin registration) must
be updated:

```typescript
// Before:
app.decorate('authenticate', async (request, reply) => {
  await request.jwtVerify();
  const { tenantId, userId } = request.user;
  const principal = await loadUserPrincipal(userId, tenantId);
  request.ctx = { tenantId, userId, ...principal };
});

// After:
app.decorate('authenticate', async (request, reply) => {
  await request.jwtVerify();
  const { sub: userId, mid: membershipId, authz_version } = request.user;

  // Load principal from membership (resolves tenant, branch, dept, roles)
  const principal = await loadUserPrincipal(userId, membershipId);
  if (!principal) throw new UnauthorizedError('Invalid session');

  // Check membership status
  if (principal.membershipStatus !== 'active') {
    throw new ForbiddenError('Membership suspended');
  }

  // Check authz version staleness
  const dbVersion = membership.authz_version;
  if (authz_version !== dbVersion) {
    // Re-issue token or reject
    // For now: reload and continue (token will be refreshed on next refresh)
  }

  // Populate request context
  request.ctx = {
    tenantId: principal.tenantId,
    userId: principal.userId,
    roles: principal.roles,
    permissions: uniquePermissionKeys(principal.grants),
    branches: principal.grants
      .filter(g => g.scope === 'branch' || g.scope === 'branches')
      .map(() => principal.branchId)
      .filter(Boolean),
    locale: principal.locale,
    branchId: principal.branchId,
    requestId: request.id,
    principal,
  };
  request.tenantId = principal.tenantId;
});
```

---

## 7. Frontend Authorization — Components & Hooks

### 7.1 AuthorizationProvider

```typescript
// packages/frontend/src/providers/AuthorizationProvider.tsx

import React, { createContext, useContext, useMemo } from 'react';
import type { Grant } from '@healthcare/shared/authz';

interface AuthContext {
  userId: string;
  membershipId: string;
  tenantId: string;
  branchId: string | null;
  departmentId: string | null;
  roles: string[];
  permissions: string[];
  grants: Grant[];
  locale: 'ar' | 'en';
  hasPermission: (permission: string, scope?: string) => boolean;
  hasAnyPermission: (permissions: string[], scope?: string) => boolean;
}

const AuthorizationContext = createContext<AuthContext | null>(null);

export function AuthorizationProvider({ children, user }) {
  const value = useMemo(() => ({
    userId: user.id,
    membershipId: user.membershipId,
    tenantId: user.tenantId,
    branchId: user.branchId,
    departmentId: user.departmentId,
    roles: user.roles,
    permissions: user.permissions,
    grants: user.grants,
    locale: user.locale,
    hasPermission: (permission: string, scope?: string) => {
      // Frontend check is cosmetic; backend is authoritative
      return user.permissions.includes(permission) ||
             user.permissions.includes('*');
    },
    hasAnyPermission: (permissions: string[], scope?: string) => {
      return permissions.some(p => user.permissions.includes(p) || user.permissions.includes('*'));
    },
  }), [user]);

  return (
    <AuthorizationContext.Provider value={value}>
      {children}
    </AuthorizationContext.Provider>
  );
}

export function useAuthorization() {
  const ctx = useContext(AuthorizationContext);
  if (!ctx) throw new Error('useAuthorization must be used within AuthorizationProvider');
  return ctx;
}
```

### 7.2 `<Can>` Component

```typescript
// packages/frontend/src/components/Can.tsx

interface CanProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({ permission, fallback = null, children }: CanProps) {
  const { hasPermission } = useAuthorization();
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}
```

### 7.3 `<ProtectedRoute>` Component

```typescript
// packages/frontend/src/components/ProtectedRoute.tsx

interface ProtectedRouteProps {
  permission: string;
  children: React.ReactNode;
}

export function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  const { hasPermission } = useAuthorization();
  const navigate = useNavigate();

  if (!hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
}
```

### 7.4 `filterMenu()` Utility

```typescript
// packages/frontend/src/utils/menu-filter.ts

interface MenuItem {
  label: string;
  path: string;
  permission?: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
}

export function filterMenu(
  items: MenuItem[],
  hasPermission: (p: string) => boolean,
): MenuItem[] {
  return items
    .filter(item => !item.permission || hasPermission(item.permission))
    .map(item => ({
      ...item,
      children: item.children
        ? filterMenu(item.children, hasPermission)
        : undefined,
    }));
}
```

### 7.5 Sidebar Menu Definition

```typescript
// packages/frontend/src/config/menu.ts

export const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    // No permission — all authenticated users see dashboard
  },
  {
    label: 'Patients',
    path: '/patients',
    permission: 'patients.view',
  },
  {
    label: 'Appointments',
    path: '/appointments',
    permission: 'appointments.view',
  },
  {
    label: 'EMR',
    path: '/emr',
    permission: 'emr.view',
  },
  {
    label: 'Billing',
    path: '/billing',
    permission: 'billing.view',
  },
  {
    label: 'Insurance',
    path: '/insurance',
    permission: 'insurance.view',
  },
  {
    label: 'Pharmacy',
    path: '/pharmacy',
    permission: 'pharmacy.view',
  },
  {
    label: 'Laboratory',
    path: '/laboratory',
    permission: 'laboratory.view',
  },
  {
    label: 'Radiology',
    path: '/radiology',
    permission: 'radiology.view',
  },
  {
    label: 'Inventory',
    path: '/inventory',
    permission: 'inventory.view',
  },
  {
    label: 'HR',
    path: '/hr',
    permission: 'hr.view',
  },
  {
    label: 'Reports',
    path: '/reports',
    permission: 'reports.view',
  },
  {
    label: 'Settings',
    path: '/settings',
    permission: 'settings.view',
  },
  {
    label: 'Audit Logs',
    path: '/audit-logs',
    permission: 'audit.view',
  },
  {
    label: 'User Management',
    path: '/users',
    permission: 'users.view',
  },
  {
    label: 'Roles & Permissions',
    path: '/roles',
    permission: 'roles.view',
  },
  {
    label: 'Communications',
    path: '/communications',
    permission: 'communications.view',
  },
  {
    label: 'Automation',
    path: '/automation',
    permission: 'automation.view',
  },
  // ... more items
];
```

---

## 8. API Contract Changes

### 8.1 Login Response (Changed)

**Before:**
```json
{
  "accessToken": "jwt...",
  "user": { "id", "email", "roles", "permissions", "branches" },
  "tenant": { "id", "name", "slug", "settings" }
}
```

**After:**
```json
{
  "accessToken": "jwt...",
  "csrfToken": "...",
  "expiresIn": 3600,
  "activeMembershipId": "uuid",
  "memberships": [
    {
      "id": "uuid",
      "tenant": { "id": "uuid", "name": "...", "slug": "..." },
      "branch": { "id": "uuid", "name": "..." } | null,
      "department": { "id": "uuid", "name": "..." } | null,
      "authzVersion": 1
    }
  ],
  "user": { "id", "email", "roles", "permissions" },
  "tenant": { "id", "name", "slug", "settings" }
}
```

### 8.2 New Endpoint: Switch Membership

**POST `/auth/switch-membership`**

Request:
```json
{ "membershipId": "uuid" }
```

Response:
```json
{
  "accessToken": "new-jwt...",
  "expiresIn": 3600,
  "activeMembershipId": "uuid",
  "user": { "id", "email", "roles", "permissions" }
}
```

### 8.3 New Endpoint: Get Memberships

**GET `/auth/memberships`**

Response:
```json
{
  "memberships": [
    {
      "id": "uuid",
      "tenant": { "id": "uuid", "name": "...", "slug": "..." },
      "branch": { "id": "uuid", "name": "..." } | null,
      "department": { "id": "uuid", "name": "..." } | null,
      "isActive": true,
      "authzVersion": 1
    }
  ],
  "activeMembershipId": "uuid"
}
```

### 8.4 JWT Refresh Response (Changed)

**POST `/auth/refresh`**

Response now includes updated `authzVersion` if it changed:
```json
{
  "accessToken": "new-jwt...",
  "expiresIn": 3600
}
```

---

## 9. Cache Strategy — Implementation

### 9.1 What Gets Cached

| Key | Value | TTL |
|-----|-------|-----|
| `auth:membership:{membershipId}` | Membership record | 5 minutes |
| `auth:principal:{userId}:{membershipId}` | Full Principal object | 5 minutes |
| `auth:permissions:{userId}:{membershipId}` | Effective permissions list | 5 minutes |
| `auth:version:{userId}:{membershipId}` | authz_version number | 5 minutes |

### 9.2 Cache Invalidation Triggers

| Event | Cache Key Pattern to Invalidate |
|-------|---------------------------------|
| Role assigned/removed from user | `auth:principal:{userId}:*`, `auth:permissions:{userId}:*` |
| Role permissions changed | `auth:principal:{userId}:*`, `auth:permissions:{userId}:*` |
| Direct permission added/removed | `auth:principal:{userId}:*`, `auth:permissions:{userId}:*` |
| Membership created/updated/suspended | `auth:membership:{membershipId}`, `auth:principal:{userId}:{membershipId}` |
| User status changed | `auth:principal:{userId}:*`, all related membership caches |
| Membership authz_version incremented | `auth:version:{userId}:{membershipId}` |

### 9.3 Implementation Pattern

```typescript
// packages/backend/src/services/authz-cache.ts

import { redis } from '../core/redis.js';

const PREFIX = 'auth:';
const TTL = 300; // 5 minutes

export async function getCachedPrincipal(
  userId: string, membershipId: string,
): Promise<Principal | null> {
  const key = `${PREFIX}principal:${userId}:${membershipId}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function setCachedPrincipal(
  userId: string, membershipId: string, principal: Principal,
): Promise<void> {
  const key = `${PREFIX}principal:${userId}:${membershipId}`;
  await redis.setex(key, TTL, JSON.stringify(principal));
}

export async function invalidateUserAuthz(userId: string): Promise<void> {
  // Invalidate all membership-specific caches for this user
  const keys = await redis.keys(`${PREFIX}*:${userId}:*`);
  if (keys.length > 0) await redis.del(...keys);
}

export async function invalidateMembershipAuthz(
  userId: string, membershipId: string,
): Promise<void> {
  const patterns = [
    `${PREFIX}membership:${membershipId}`,
    `${PREFIX}principal:${userId}:${membershipId}`,
    `${PREFIX}permissions:${userId}:${membershipId}`,
    `${PREFIX}version:${userId}:${membershipId}`,
  ];
  await redis.del(...patterns);
}
```

### 9.4 Cache in loadUserPrincipal()

```typescript
export async function loadUserPrincipal(
  userId: string, membershipId: string,
): Promise<Principal | null> {
  // 1. Try cache first
  const cached = await getCachedPrincipal(userId, membershipId);
  if (cached) return cached;

  // 2. Load from DB (full query as described in section 6.1)
  const principal = await loadPrincipalFromDb(userId, membershipId);
  if (!principal) return null;

  // 3. Cache for next time
  await setCachedPrincipal(userId, membershipId, principal);

  return principal;
}
```

---

## 10. Migration Safety Plan

### Phase 1 Safety (Memberships + JWT Refactor)

**CRITICAL:** This must be done in a way that does not break the running app.

#### Step 1: Deploy membership table (backward compatible)
1. Create `memberships` table
2. Backfill from existing `users.tenant_id` + `users.branch_id`
3. **JWT still carries `tenantId`** — old code continues to work
4. **Test:** Run existing tests, verify login still works

#### Step 2: Dual-mode JWT (transition period)
1. New JWT includes both old (`tenantId`) AND new (`mid`) fields
2. `loadUserPrincipal()` accepts both signatures:
   - If `mid` is present → use new membership path
   - If `tenantId` is present (old token) → fall back to old path
3. **Test:** Both old and new tokens work

#### Step 3: Frontend sends membership ID
1. Login response includes memberships list
2. Frontend stores `activeMembershipId`
3. Frontend includes `membershipId` in request headers (optional fallback)

#### Step 4: Cut over to new JWT only
1. Remove `tenantId` from JWT payload
2. Remove old-path fallback from `loadUserPrincipal()`
3. Old tokens fail gracefully (user re-logs)
4. **Test:** Full regression

#### Step 5: Cleanup
1. Remove `tenantId` from JWT signing
2. Remove dead code from old path

### Data Integrity During Migration

- All existing `users.tenant_id` values are preserved in `memberships`
- All existing `user_branches` entries are preserved
- No data is deleted — only new tables/columns are added
- `perm_version` on `users` is kept but becomes read-only (source of truth moves to `memberships.authz_version`)

---

## 11. Test Plan — Per Phase

### Phase 1 Tests

| Test | Expected | File |
|------|----------|------|
| Login returns memberships list | `memberships.length >= 1` | `auth.integration.test.ts` |
| Login JWT contains `sub`, `mid`, `sid` | No `tenantId` in JWT | `auth.integration.test.ts` |
| `loadUserPrincipal(userId, membershipId)` returns correct tenant | `principal.tenantId` matches membership | `authorization.unit.test.ts` |
| `loadUserPrincipal` with invalid membership returns null | `null` | `authorization.unit.test.ts` |
| Switch membership issues new JWT | New JWT has different `mid` | `auth.integration.test.ts` |
| Old JWT without `mid` fails authenticate | `401 Unauthorized` | `auth.integration.test.ts` |
| Multi-membership user sees all memberships on login | Correct count | `auth.integration.test.ts` |

### Phase 2 Tests

| Test | Expected | File |
|------|----------|------|
| Doctor sees only assigned patients | `patients` filtered by assignment | `patients.scope.test.ts` |
| Nurse sees department patients only | `patients` filtered by department | `patients.scope.test.ts` |
| Receptionist sees branch patients only | `patients` filtered by branch | `patients.scope.test.ts` |
| Admin sees all tenant patients | No extra filter | `patients.scope.test.ts` |
| DENY permission blocks access | `hasPermission()` returns false | `authorization.unit.test.ts` |
| DENY overrides role ALLOW | Export denied despite role allowing | `authorization.unit.test.ts` |
| Wildcard `*` grants all permissions | `hasPermission('*')` returns true | `authorization.unit.test.ts` |
| Cache hit avoids DB query | Principal loaded from Redis | `authz-cache.test.ts` |
| Cache invalidation clears stale data | Next request hits DB | `authz-cache.test.ts` |

### Phase 3 Tests

| Test | Expected | File |
|------|----------|------|
| `scopeQuery()` adds tenant filter | `WHERE tenant_id = ?` | `scope.unit.test.ts` |
| `scopeQuery()` adds branch filter | `WHERE branch_id IN (?)` | `scope.unit.test.ts` |
| `scopeQuery()` adds department filter | `WHERE department_id = ?` | `scope.unit.test.ts` |
| Module policy translates scope correctly | SQL matches expected | `module-scope.test.ts` |
| Every list endpoint has scope filter | No unfiltered queries | `integration.test.ts` |

### Phase 4 Tests

| Test | Expected | File |
|------|----------|------|
| Sidebar shows only permitted links | Menu filtered by permissions | `menu-filter.test.tsx` |
| `<Can>` renders for authorized user | Component visible | `Can.test.tsx` |
| `<Can>` hides for unauthorized user | Component hidden | `Can.test.tsx` |
| `<ProtectedRoute>` redirects unauthorized | Navigate to /unauthorized | `ProtectedRoute.test.tsx` |
| `filterMenu()` returns empty for no permissions | Empty array | `menu-filter.test.ts.ts` |

### Phase 5 Tests

| Test | Expected | File |
|------|----------|------|
| 39 role templates seed correctly | All 39 exist in DB | `seed-roles.test.ts` |
| Each template has correct grants | Match spec | `seed-roles.test.ts` |
| Tenant can clone template | New role created from template | `roles.integration.test.ts` |
| Tenant customization doesn't affect template | Template unchanged | `roles.integration.test.ts` |

---

## 12. Rollback Procedures

### Phase 1 Rollback
1. Revert migration 042 (`down()` drops memberships table)
2. Revert auth.controller.ts to old login flow
3. Revert JWT payload to `{ tenantId, userId }`
4. Revert `loadUserPrincipal()` to `(userId, tenantId)` signature
5. Users re-login (old tokens work again)

### Phase 2 Rollback
1. Remove cache layer (loadUserPrincipal always hits DB)
2. Revert `hasPermission()` to old logic
3. Remove deny support (user_permissions.type column stays, ignored)

### Phase 3 Rollback
1. Remove scope filters from controllers
2. Revert `scopeQuery()` to old version

### Phase 4 Rollback
1. Remove AuthorizationProvider from React tree
2. Revert sidebar to static menu
3. Remove `<Can>` and `<ProtectedRoute>` wrappers

---

## 13. The 39 Roles — Full Permission Matrix

### Platform Roles (system scope)

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| 1. Platform Super Admin | `system` | `*` across all tenants |

### Tenant Administration Roles

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| 2. Tenant Administrator | `tenant` | `*` within tenant |
| 3. IT Administrator | `tenant` | `settings.manage`, `users.*`, `audit.view` |
| 4. Compliance Officer | `tenant` | `audit.view`, `compliance.*` |
| 5. Internal Auditor | `tenant` | `audit.view`, `reports.view` |

### Management Roles

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| 6. Branch Manager | `branch` | Branch-level admin + clinical overview |
| 7. Medical Director | `tenant` | `emr.*`, `reports.view`, clinical oversight |
| 8. Department Manager | `department` | Department-level admin |
| 9. Hospital Administrator | `tenant` | Operations + performance |
| 10. Quality Manager | `tenant` | `compliance.*`, `reports.view` |

### Clinical Roles

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| 11. Doctor | `assigned_patients` | `patients.view/edit`, `emr.*`, `appointments.view/edit` |
| 12. Resident / Trainee Doctor | `assigned_patients` | `patients.view`, `emr.view/create` |
| 13. External Consultant | `assigned_patients` | `patients.view`, `emr.view` |
| 14. Nurse | `department` | `patients.view/edit`, `nursing.*`, `emr.view/create` |
| 15. Nurse Manager | `branch` | `nursing.*`, `hr.view` |

### Front Desk & Coordination Roles

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| 16. Receptionist | `branch` | `patients.*`, `appointments.*`, `billing.view/create` |
| 17. Appointment Coordinator | `branch` | `appointments.*`, `patients.view` |
| 18. Call Center Agent | `branch` | `patients.view`, `appointments.view` |
| 19. Medical Records Officer | `tenant` | `emr.*`, `dms.*` |
| 20. Customer Service Officer | `tenant` | `patients.view`, complaint handling |

### Clinical Support Roles

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| 21. Pharmacist | `branch` | `pharmacy.*`, `patients.view` |
| 22. Laboratory Staff | `branch` | `laboratory.*`, `patients.view` |
| 23. Laboratory Supervisor | `branch` | `laboratory.*`, `reports.view` |
| 24. Radiology Technician | `branch` | `radiology.*`, `patients.view` |
| 25. Radiologist | `branch` | `radiology.*`, `emr.view` |

### Financial Roles

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| 26. Billing Officer | `branch` | `billing.*`, `insurance.view` |
| 27. Finance / Accountant | `tenant` | `billing.*`, `expenses.*`, `reports.view` |
| 28. Insurance Officer | `tenant` | `insurance.*`, `insurance_claims.*` |
| 29. Payroll Officer | `tenant` | `hr.payroll`, `reports.view` |

### Operations Roles

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| 30. HR Manager | `tenant` | `hr.*`, `reports.view` |
| 31. HR Staff | `tenant` | `hr.view/create/edit` |
| 32. Inventory Manager | `tenant` | `inventory.*`, `reports.view` |
| 33. Storekeeper | `branch` | `inventory.view/edit` |
| 34. Procurement Officer | `tenant` | `inventory.*`, `reports.view` |
| 35. Equipment Technician | `branch` | `inventory.view`, `workflow.*` |

### Portal & External Roles

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| 36. Patient | `self` | Own data only |
| 37. Guardian / Parent | `self` | Dependent data |
| 38. Vendor / Supplier | `self` | Own supplier account |
| 39. Guest | `self` | Explicitly assigned only |

### Implementation Note

- The current 15 seed roles **stay as-is** in `SEED_ROLES`
- The remaining 24 roles are added as **system templates**
- Tenants **clone** templates to create tenant-specific roles
- Cloned roles can modify permissions and scopes

---

## 14. Scope Policies — Per Module

Each module defines how it translates a scope level into database constraints.

### Patients Module

```typescript
// packages/backend/src/modules/patients/scope-policy.ts
export function applyPatientScope(qb, principal, scope) {
  qb.where('tenant_id', principal.tenantId);
  switch (scope) {
    case 'system':
    case 'tenant':
      break; // no additional filter
    case 'branches':
    case 'branch':
      if (principal.branchId) qb.where('branch_id', principal.branchId);
      else qb.where(false);
      break;
    case 'department':
      if (principal.departmentId) qb.where('department_id', principal.departmentId);
      else qb.where(false);
      break;
    case 'assigned_patients':
      // Filter to patients assigned via appointments
      qb.whereIn('id', assignedPatientIdsSubquery(principal));
      break;
    case 'self':
      // Patient portal: only own record
      qb.where('id', principal.patientId);
      break;
  }
}
```

### Appointments Module

```typescript
export function applyAppointmentScope(qb, principal, scope) {
  qb.where('tenant_id', principal.tenantId);
  switch (scope) {
    case 'tenant': break;
    case 'branch': qb.where('branch_id', principal.branchId); break;
    case 'department': qb.whereIn('doctor_id', deptDoctorIdsSubquery(principal)); break;
    case 'assigned_patients': qb.where('doctor_id', principal.userId); break;
    case 'self': qb.where('patient_id', principal.patientId); break;
  }
}
```

### Billing Module

```typescript
export function applyBillingScope(qb, principal, scope) {
  qb.where('tenant_id', principal.tenantId);
  switch (scope) {
    case 'tenant': break;
    case 'branch': qb.where('branch_id', principal.branchId); break;
    // Billing has no 'department' or 'assigned_patients' scope
  }
}
```

### HR Module

```typescript
export function applyHrScope(qb, principal, scope) {
  qb.where('tenant_id', principal.tenantId);
  switch (scope) {
    case 'tenant': break;
    case 'branch': qb.where('branch_id', principal.branchId); break;
    case 'department': qb.where('department_id', principal.departmentId); break;
    case 'self': qb.where('id', principal.userId); break;
  }
}
```

### Inventory Module

```typescript
export function applyInventoryScope(qb, principal, scope) {
  qb.where('tenant_id', principal.tenantId);
  switch (scope) {
    case 'tenant': break;
    case 'branch': qb.where('branch_id', principal.branchId); break;
    case 'department': qb.where('department_id', principal.departmentId); break;
  }
}
```

### Audit Logs Module

```typescript
export function applyAuditScope(qb, principal, scope) {
  qb.where('tenant_id', principal.tenantId);
  // Audit logs are typically tenant-wide for those who have access
  // Branch-level audit is rare but supported
  if (scope === 'branch' && principal.branchId) {
    qb.where('branch_id', principal.branchId);
  }
}
```

### Rule: Every List Endpoint MUST Use Scope

```typescript
// CORRECT:
router.get('/patients', { preHandler: [authenticate, authorize('patients.view')] }, async (req) => {
  const principal = getCtx(req).principal;
  const scope = resolveScope(principal, 'patients.view'); // gets effective scope
  const qb = db('patients');
  applyPatientScope(qb, principal, scope);
  return qb;
});

// WRONG — never do this:
router.get('/patients', { preHandler: [authenticate, authorize('patients.view')] }, async (req) => {
  return db('patients').where('tenant_id', getTenantId(req)); // no scope filter!
});
```

---

## 15. Non-Negotiable Rules

These are the absolute constraints that must never be violated:

1. **JWT = identity only.** Never put tenant, branch, department, roles, or permissions in JWT claims.

2. **Membership = organizational context.** Tenant, branch, department come from the membership table, resolved server-side.

3. **Backend is the sole authorization authority.** Frontend `<Can>` checks are cosmetic UX; the backend `authorize()` is the real gate.

4. **Every data-returning endpoint enforces permission + scope.** No exceptions. Including: list, search, view, create, update, delete, export, print, download, reports, dashboard aggregates, bulk operations, approval actions.

5. **Denials override allows.** A direct denial on a user always wins, regardless of role grants.

6. **Cache invalidation is immediate.** When roles, permissions, memberships, or direct grants change, the cache is invalidated before the response returns.

7. **Scope never exceeds the user's highest role scope.** A user cannot request broader scope than their roles provide.

8. **PostgreSQL receives already-scoped queries.** The controller never builds an unfiltered query.

9. **Multi-tenant users switch context via membership.** Not via JWT manipulation. Not via query parameters.

10. **All 39 role templates are system-level.** Tenants clone and customize them. Templates themselves are never modified by tenants.

11. **Authorization applies to ALL modules.** Not just clinical. Not just patients. Every module with data enforces scope.

12. **A hidden frontend link is not security.** The backend must independently verify permission on every endpoint.

13. **Permission versioning prevents stale access.** When authorization data changes, the version increments. If JWT version < DB version, the cache is invalidated.

14. **Emergency access is audited and time-limited.** Break-glass access is always logged and expires automatically.

15. **No hardcoded tenant IDs in queries.** Always resolve from membership.

---

## Appendix A: File Change Summary

| File | Action | Phase |
|------|--------|-------|
| `migrations/042_memberships.ts` | CREATE | 1 |
| `packages/shared/src/authz/index.ts` | ADD 24 role templates | 5 |
| `packages/backend/src/services/authorization.ts` | REWRITE Principal + loadUserPrincipal | 1 |
| `packages/backend/src/services/authz-cache.ts` | CREATE | 2 |
| `packages/backend/src/modules/auth/auth.service.ts` | REWRITE JWT payload + signing | 1 |
| `packages/backend/src/modules/auth/auth.controller.ts` | REWRITE login, ADD switchMembership | 1 |
| `packages/backend/src/modules/auth/auth.routes.ts` | ADD switch-membership route | 1 |
| `packages/backend/src/modules/auth-guard.ts` | UPDATE authenticate decorator | 1 |
| `packages/frontend/src/providers/AuthorizationProvider.tsx` | CREATE | 4 |
| `packages/frontend/src/components/Can.tsx` | CREATE | 4 |
| `packages/frontend/src/components/ProtectedRoute.tsx` | CREATE | 4 |
| `packages/frontend/src/utils/menu-filter.ts` | CREATE | 4 |
| `packages/frontend/src/config/menu.ts` | UPDATE to permission-driven | 4 |

## Appendix B: Scope Level Hierarchy

```
self(0) < assigned_patients(1) < department(2) < branch(3) < branches(4) < tenant(5) < system(6)
```

A grant at a higher level covers all lower levels. A grant at `branch` scope
covers `department`, `assigned_patients`, and `self` requests.

## Appendix C: Permission Key Format

```
module.action       → patients.view
module.*            → patients.* (all actions in module)
*                   → everything (super_admin only)
```

**Resolution order:**
1. Check for exact match: `patients.view`
2. Check for module wildcard: `patients.*`
3. Check for global wildcard: `*`
4. If none match → denied

## Appendix D: Denial Resolution

```
Effective =
  (RolePermissions ∪ DirectAllows)
  − DirectDenials
```

A denial on `patients.export` means that even if the role grants `patients.*`,
the user CANNOT export patients. The denial wins.

---

*This document is the definitive implementation reference. Every code change
must conform to these specifications. When in doubt, this document wins.*

*Last updated: 2026-08-17*
