# Hospital ERP — Authorization Architecture

> **Single source of truth.** Every implementation decision for authentication,
> authorization, role management, data scoping, and frontend access control
> must conform to this document.

---

## Table of Contents

1. [Core Principles](#1-core-principles)
2. [Authorization Flow](#2-authorization-flow)
3. [Database Schema](#3-database-schema)
4. [JWT Structure](#4-jwt-structure)
5. [Membership Model](#5-membership-model)
6. [Role System](#6-role-system)
7. [Permission System](#7-permission-system)
8. [Effective Permission Resolution](#8-effective-permission-resolution)
9. [Scope Engine](#9-scope-engine)
10. [Module-Specific Scope Policies](#10-module-specific-scope-policies)
11. [The `authorize()` Gateway](#11-the-authorize-gateway)
12. [Cache Strategy](#12-cache-strategy)
13. [Permission Versioning](#13-permission-versioning)
14. [Frontend Authorization](#14-frontend-authorization)
15. [Protected Operations](#15-protected-operations)
16. [The 39 System Role Templates](#16-the-39-system-role-templates)
17. [Direct Permissions & Denials](#17-direct-permissions--denials)
18. [Wildcard Resolution](#18-wildcard-resolution)
19. [Multi-Tenant & Multi-Branch Users](#19-multi-tenant--multi-branch-users)
20. [Security Rules](#20-security-rules)
21. [Implementation Phases](#21-implementation-phases)

---

## 1. Core Principles

### 1.1 Authentication ≠ Authorization

Authentication answers: **Who are you?**
Authorization answers: **What can you do, and what data can you see?**

These are separate concerns. JWT handles authentication. The authorization
engine handles everything else. **Never mix them.**

### 1.2 The 10 Rules

| # | Rule |
|---|------|
| 1 | JWT identifies the user and active membership. **Never** trust tenant, branch, department, roles, or permissions from JWT claims. |
| 2 | Membership determines the user's current organizational context. |
| 3 | Roles provide permission grants. |
| 4 | Direct permissions add user-specific grants. |
| 5 | Explicit denials override grants. |
| 6 | Effective permissions get resolved once and cached. Invalidate cache whenever authorization data changes. |
| 7 | `authorize()` checks whether the user has the requested permission and determines the applicable scope. |
| 8 | Each module owns its scope policy. |
| 9 | The scope policy generates database constraints. |
| 10 | PostgreSQL receives an already-scoped query. |

### 1.3 No Security Through Obscurity

- Hiding a frontend link is **not** security.
- A permission check without a scope filter is **incomplete** authorization.
- Every data-returning endpoint must enforce both permission AND scope.
- The frontend only reflects backend decisions; it never determines them.

---

## 2. Authorization Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        REQUEST ARRIVES                           │
│                    JWT: user_id + membership_id                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ AUTHENTICATE│  Verify JWT signature, expiry,
                    │             │  session validity
                    └──────┬──────┘
                           │
                    ┌──────▼──────────┐
                    │ LOAD MEMBERSHIP │  From cache or DB:
                    │                 │  tenant_id, branch_id,
                    │                 │  department_id, status
                    └──────┬──────────┘
                           │
                    ┌──────▼──────────────┐
                    │ LOAD EFFECTIVE AUTH │  From cache or DB:
                    │                     │  roles, permissions,
                    │                     │  direct grants, denials
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │   authorize()       │  Check: does the user
                    │   permission check  │  have this permission?
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │   SCOPE RESOLUTION  │  What data scope applies?
                    │   (highest scope    │  OWN → ASSIGNED → DEPT
                    │    wins)            │  → BRANCH → TENANT → GLOBAL
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │  MODULE SCOPE       │  Module-specific policy
                    │  POLICY             │  translates scope into
                    │                     │  concrete WHERE clauses
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │  DATABASE QUERY     │  Already scoped.
                    │  SELECT ...         │  No unscoped data
                    │  WHERE tenant_id=?  │  can leak.
                    │  AND assigned_to=?  │
                    └─────────────────────┘
```

### 2.1 Step-by-Step

1. **JWT arrives** — contains `user_id`, `active_membership_id`, `session_id`, `authz_version`.
2. **Authenticate** — verify JWT signature, check session is active, check `authz_version` matches.
3. **Load Membership** — resolve `tenant_id`, `branch_id`, `department_id`, `status` from the `memberships` table using `active_membership_id`. Membership must be `ACTIVE`.
4. **Load Effective Permissions** — union of role permissions + direct permissions − explicit denials. Cached per session.
5. **authorize({ permission, scope })** — check if the resolved effective permissions include the requested permission. If scope is `"auto"`, determine the highest applicable scope from the user's roles.
6. **Module Scope Policy** — the target module translates the resolved scope into concrete query constraints.
7. **Database Query** — the query already includes the scope constraints. PostgreSQL returns only authorized data.

---

## 3. Database Schema

### 3.1 Core Tables

```sql
-- ═══════════════════════════════════════════════════════════════
-- TENANTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  settings    JSONB DEFAULT '{}',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- BRANCHES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  address     TEXT,
  phone       VARCHAR(30),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);
CREATE INDEX idx_branches_tenant ON branches(tenant_id);

-- ═══════════════════════════════════════════════════════════════
-- DEPARTMENTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, branch_id, name)
);
CREATE INDEX idx_departments_tenant ON departments(tenant_id);
CREATE INDEX idx_departments_branch ON departments(branch_id);

-- ═══════════════════════════════════════════════════════════════
-- USERS (identity only — no tenant context here)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  phone           VARCHAR(30),
  is_active       BOOLEAN DEFAULT TRUE,
  locale          VARCHAR(5) DEFAULT 'en',
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- MEMBERSHIPS (the single source of truth for organizational context)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  status          VARCHAR(20) DEFAULT 'active'
                  CHECK (status IN ('active', 'suspended', 'invited', 'archived')),
  authz_version   INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id, branch_id, department_id)
);
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_tenant ON memberships(tenant_id);
CREATE INDEX idx_memberships_user_tenant ON memberships(user_id, tenant_id);

-- ═══════════════════════════════════════════════════════════════
-- ROLES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = system role
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(200) NOT NULL,
  description     TEXT,
  scope_default   VARCHAR(30) DEFAULT 'tenant'
                  CHECK (scope_default IN (
                    'self','assigned_patients','department',
                    'branch','branches','tenant','system'
                  )),
  is_system       BOOLEAN DEFAULT FALSE,   -- system templates cannot be deleted
  is_template     BOOLEAN DEFAULT FALSE,   -- template = cloneable by tenants
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);
CREATE INDEX idx_roles_tenant ON roles(tenant_id);

-- ═══════════════════════════════════════════════════════════════
-- PERMISSIONS (the catalog — static, never tenant-scoped)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(100) UNIQUE NOT NULL,  -- e.g. 'patients.view'
  module      VARCHAR(50) NOT NULL,
  action      VARCHAR(50) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- USER ROLES (which roles a user has within a membership)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE user_roles (
  membership_id   UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (membership_id, role_id)
);

-- ═══════════════════════════════════════════════════════════════
-- ROLE PERMISSIONS (which permissions each role grants)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  scope         VARCHAR(30) DEFAULT 'tenant'
                CHECK (scope IN (
                  'self','assigned_patients','department',
                  'branch','branches','tenant','system'
                )),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- ═══════════════════════════════════════════════════════════════
-- DIRECT USER PERMISSIONS (user-specific grants and denials)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE user_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect        VARCHAR(10) NOT NULL CHECK (effect IN ('allow', 'deny')),
  scope         VARCHAR(30),
  granted_by    UUID REFERENCES users(id),
  reason        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(membership_id, permission_id)
);

-- ═══════════════════════════════════════════════════════════════
-- SESSIONS (for session tracking and invalidation)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE user_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_id   UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  refresh_token   VARCHAR(500) UNIQUE NOT NULL,
  authz_version   INTEGER NOT NULL DEFAULT 1,
  ip_address      INET,
  user_agent      TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_used_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_refresh ON user_sessions(refresh_token);
```

### 3.2 Entity Relationship

```
tenants ──┬── branches ──── departments
          │
          ├── roles ──── role_permissions ──── permissions
          │
          └── memberships ──── users
                │
                ├── user_roles ──── roles
                │
                └── user_permissions ──── permissions
```

---

## 4. JWT Structure

### 4.1 What Goes IN the JWT

```json
{
  "sub": "user_uuid",
  "mid": "membership_uuid",
  "sid": "session_uuid",
  "authz_version": 17,
  "iat": 1723862400,
  "exp": 1723866000
}
```

| Claim | Description |
|-------|-------------|
| `sub` | User ID |
| `mid` | Active Membership ID |
| `sid` | Session ID |
| `authz_version` | Authorization version for staleness detection |
| `iat` | Issued at |
| `exp` | Expiration |

### 4.2 What NEVER Goes in the JWT

- ❌ `tenant_id`
- ❌ `branch_id`
- ❌ `department_id`
- ❌ `roles`
- ❌ `permissions`
- ❌ `scope`
- ❌ Any authorization data

**The JWT identifies who you are and which membership you're using.
Everything else is resolved from the database.**

---

## 5. Membership Model

### 5.1 What is a Membership

A Membership ties a User to an organizational context:
- **Tenant** (which hospital organization)
- **Branch** (which location, optional)
- **Department** (which department, optional)
- **Status** (active, suspended, invited, archived)

### 5.2 Multi-Membership Users

A single user can have multiple memberships:

```
Dr. Ahmed:
  Membership 1: Hospital A → Cairo Branch → Ophthalmology
  Membership 2: Hospital A → Giza Branch → Ophthalmology
  Membership 3: Hospital B → Alexandria Branch → Ophthalmology
```

After login, the user selects which membership is active.
The JWT carries the `active_membership_id`.

### 5.3 Switching Context

To switch branch or tenant:
1. User selects new membership
2. Backend creates new session with new JWT containing new `membership_id`
3. Old session is invalidated (or kept if multi-session is allowed)

### 5.4 Membership Status

| Status | Meaning |
|--------|---------|
| `active` | Full access per permissions |
| `suspended` | All access revoked, session invalidated |
| `invited` | Pending acceptance, limited access |
| `archived` | Historical record, no access |

---

## 6. Role System

### 6.1 Role Hierarchy

```
System Role Template (is_system=TRUE, is_template=TRUE)
        ↓
Tenant Role (cloned from template, tenant_id set)
        ↓
Customization (permissions added/removed, scope adjusted)
        ↓
Assigned to User via Membership → user_roles
```

### 6.2 Role Properties

| Property | Description |
|----------|-------------|
| `tenant_id` | NULL = system role; set = tenant-specific role |
| `is_system` | TRUE = cannot be deleted |
| `is_template` | TRUE = can be cloned by tenants |
| `scope_default` | Default data scope when this role is assigned |

### 6.3 Scope Values

| Scope | Rank | Data Access |
|-------|------|-------------|
| `self` | 0 | Only records created by the user |
| `assigned_patients` | 1 | Only patients assigned to the user |
| `department` | 2 | All records in the user's department |
| `branch` | 3 | All records in the user's branch |
| `branches` | 4 | All records across user's branches |
| `tenant` | 5 | All records in the tenant |
| `system` | 6 | All records across all tenants (super admin) |

Higher rank scopes include lower rank scopes. A user with `branch` scope
can see everything a user with `department` scope can see.

---

## 7. Permission System

### 7.1 Permission Key Format

```
module.action
```

Examples:
- `patients.view`
- `patients.create`
- `billing.export`
- `hr.manage`

### 7.2 Wildcard Permissions

| Wildcard | Resolves To |
|----------|-------------|
| `*` | All permissions in all modules |
| `module.*` | All actions for that module |
| `module.action` | Specific permission |

Resolution is done at runtime. Wildcards are **never** physically stored
as individual permission rows. The authorization engine resolves them.

### 7.3 Permission Catalog

The `PERMISSION_CATALOG` in `packages/shared/src/authz/index.ts`
is the single source of truth. It defines:
- Every module
- Every action available for that module
- The complete set of valid permission keys

---

## 8. Effective Permission Resolution

### 8.1 Formula

```
Effective Permissions =
  (Role Permissions from all roles)
  ∪ (Direct User Permissions with effect=allow)
  − (Direct User Permissions with effect=deny)
```

### 8.2 Resolution Algorithm

```
function resolveEffectivePermissions(membershipId):
  1. Load all roles for this membership
  2. Collect all role_permissions (permission_id, scope)
  3. Load all user_permissions for this membership
  4. For each user_permission:
     - If effect=allow: add to grants
     - If effect=deny: add to denials
  5. Effective = role_grants ∪ direct_grants − denials
  6. For each effective permission, determine highest scope
  7. Return effective permission set with scopes
```

### 8.3 Scope Determination

When the same permission appears in multiple roles with different scopes,
the **highest scope wins**.

Example:
- Role "Doctor" grants `patients.view` with scope `assigned_patients`
- Role "Department Head" grants `patients.view` with scope `department`
- Result: `patients.view` with scope `department`

---

## 9. Scope Engine

### 9.1 Purpose

The scope engine translates a resolved scope into concrete database
constraints for each module.

### 9.2 Scope Constraint Generator

```typescript
interface ScopeContext {
  tenantId: string;
  branchId?: string | null;
  departmentId?: string | null;
  userId: string;
}

function applyScopeConstraint(
  scope: PermissionScope,
  ctx: ScopeContext,
  tableAlias?: string
): WhereClause {
  const prefix = tableAlias ? `${tableAlias}.` : '';

  switch (scope) {
    case 'system':
      return {};  // no constraint — sees everything

    case 'tenant':
      return { [`${prefix}tenant_id`]: ctx.tenantId };

    case 'branches':
    case 'branch':
      return {
        [`${prefix}tenant_id`]: ctx.tenantId,
        [`${prefix}branch_id`]: ctx.branchId,
      };

    case 'department':
      return {
        [`${prefix}tenant_id`]: ctx.tenantId,
        [`${prefix}department_id`]: ctx.departmentId,
      };

    case 'assigned_patients':
      return {
        [`${prefix}tenant_id`]: ctx.tenantId,
        [`${prefix}assigned_doctor_id`]: ctx.userId,
      };

    case 'self':
      return {
        [`${prefix}tenant_id`]: ctx.tenantId,
        [`${prefix}created_by`]: ctx.userId,
      };

    default:
      return { id: '__NO_ACCESS__' };
  }
}
```

---

## 10. Module-Specific Scope Policies

Each module defines what scopes are valid and how they map to query
constraints. **Not all scopes apply to all modules.**

### 10.1 Patients Module

| Valid Scopes | Query Constraint |
|-------------|------------------|
| `self` | `created_by = userId` |
| `assigned_patients` | `assigned_doctor_id = userId` |
| `department` | `department_id = departmentId` |
| `branch` | `branch_id = branchId` |
| `tenant` | (no extra constraint beyond tenant) |

### 10.2 Appointments Module

| Valid Scopes | Query Constraint |
|-------------|------------------|
| `self` | `created_by = userId` |
| `assigned_patients` | `doctor_id = userId` |
| `department` | `department_id = departmentId` |
| `branch` | `branch_id = branchId` |
| `tenant` | (no extra constraint) |

### 10.3 Billing Module

| Valid Scopes | Query Constraint |
|-------------|------------------|
| `self` | `created_by = userId` |
| `branch` | `branch_id = branchId` |
| `tenant` | (no extra constraint) |

### 10.4 HR Module

| Valid Scopes | Query Constraint |
|-------------|------------------|
| `self` | `employee_user_id = userId` |
| `department` | `department_id = departmentId` |
| `branch` | `branch_id = branchId` |
| `tenant` | (no extra constraint) |

### 10.5 Inventory Module

| Valid Scopes | Query Constraint |
|-------------|------------------|
| `department` | `department_id = departmentId` |
| `branch` | `branch_id = branchId` |
| `tenant` | (no extra constraint) |

### 10.6 Medical Records Module

| Valid Scopes | Query Constraint |
|-------------|------------------|
| `assigned_patients` | `patient.assigned_doctor_id = userId` |
| `department` | `patient.department_id = departmentId` |
| `branch` | `patient.branch_id = branchId` |
| `tenant` | (no extra constraint) |

### 10.7 Audit Logs Module

| Valid Scopes | Query Constraint |
|-------------|------------------|
| `branch` | `branch_id = branchId` |
| `tenant` | (no extra constraint) |

### 10.8 Reports / Aggregates Module

| Valid Scopes | Query Constraint |
|-------------|------------------|
| `branch` | All underlying queries scoped to branch |
| `tenant` | All underlying queries scoped to tenant |

Reports aggregate data from multiple modules. The scope constraint
is applied to each underlying query before aggregation.

### 10.9 Adding New Modules

When adding a new module, define:

```typescript
const moduleScopePolicy = {
  module: 'new_module',
  validScopes: ['self', 'department', 'branch', 'tenant'],
  scopeResolvers: {
    self: (ctx) => ({ created_by: ctx.userId }),
    department: (ctx) => ({ department_id: ctx.departmentId }),
    branch: (ctx) => ({ branch_id: ctx.branchId }),
    tenant: (ctx) => ({}),  // tenant scope = no extra constraint
  },
};
```

---

## 11. The `authorize()` Gateway

### 11.1 Signature

```typescript
authorize({
  permission: string,      // e.g. 'patients.view'
  scope?: PermissionScope, // 'auto' = resolve from roles
}): Middleware
```

### 11.2 Behavior

1. Extract `user_id` and `active_membership_id` from JWT.
2. Load effective authorization context (from cache or DB).
3. Check if `permission` is in effective permissions.
4. If not found, check wildcard resolution:
   - `*` → allowed
   - `module.*` → allowed for that module
5. Check if `permission` is explicitly denied → 403.
6. Determine scope:
   - If scope specified in request → use it (must be ≤ role's scope)
   - If scope is `"auto"` → use highest scope from roles
7. Attach scope context to request for module policies.
8. Call `next()`.

### 11.3 Response on Failure

```json
{
  "success": false,
  "error": "Forbidden",
  "permission": "patients.export",
  "message": "You do not have permission to export patients"
}
```

### 11.4 Usage

```typescript
// In route definitions:
app.get('/api/v1/policies',
  { preHandler: [authenticate, authorize({ permission: 'policies.view' })] },
  policyController.list
);

app.post('/api/v1/policies',
  { preHandler: [authenticate, authorize({ permission: 'policies.create' })] },
  policyController.create
);

// In controllers, apply scope:
const scopeConstraint = applyScopeConstraint(
  request.scope, request.scopeContext
);
const results = await db('policies')
  .where('tenant_id', request.tenantId)
  .where(scopeConstraint);
```

---

## 12. Cache Strategy

### 12.1 What Gets Cached

The resolved authorization context for each active session:

```typescript
interface CachedAuthContext {
  membership: {
    tenantId: string;
    branchId: string | null;
    departmentId: string | null;
    status: string;
  };
  permissions: Map<string, { scope: PermissionScope; effect: 'allow' | 'deny' }>;
  roles: Array<{ id: string; name: string; scopeDefault: PermissionScope }>;
  authzVersion: number;
}
```

### 12.2 Cache Key

```
auth:ctx:{membership_id}
```

Stored in Redis with TTL matching session expiry.

### 12.3 Cache Invalidation Triggers

Invalidate cache when ANY of these change:

- Role permissions modified
- User role assigned or removed
- Direct user permission added, changed, or removed
- Membership status changed
- Membership branch/department changed
- Role created, modified, or deleted

### 12.4 Invalidation Implementation

```typescript
async function invalidateAuthCache(membershipId: string): Promise<void> {
  await redis.del(`auth:ctx:${membershipId}`);

  // Increment authz_version on the membership
  await db('memberships')
    .where({ id: membershipId })
    .increment('authz_version', 1);

  // Invalidate all sessions for this membership
  await db('user_sessions')
    .where({ membership_id: membershipId })
    .update({ authz_version: db.raw('authz_version + 1') });
}
```

---

## 13. Permission Versioning

### 13.1 Purpose

Prevents stale permissions from lingering after role/permission changes.

### 13.2 Mechanism

1. Each membership has an `authz_version` counter (starts at 1).
2. JWT contains `authz_version` at time of issuance.
3. On each request, compare JWT version with DB version.
4. If JWT version < DB version → authorization data has changed →
   force re-authentication or refresh.

### 13.3 Flow

```
JWT.authz_version = 17
DB.membership.authz_version = 18

→ Cache miss or version mismatch
→ Reload authorization context from DB
→ Issue new JWT with authz_version = 18
→ Continue request
```

### 13.4 When Version Increments

| Action | Who |
|--------|-----|
| Role permissions changed | Tenant Admin |
| User role assigned/removed | Tenant Admin |
| Direct permission granted/revoked | Tenant Admin |
| Membership status changed | Platform Admin |
| Membership branch/dept changed | Tenant Admin |

---

## 14. Frontend Authorization

### 14.1 AuthorizationProvider

Loaded once after login. Provides authorization context to entire app.

```tsx
<AuthorizationProvider>
  <App />
</AuthorizationProvider>
```

### 14.2 useAuthorization() Hook

```typescript
const {
  loading,
  permissions,        // string[]
  roles,              // { id, name, scope }[]
  scopes,             // string[]
  tenantId,
  branchId,
  departmentId,
  hasPermission,      // (perm: string) => boolean
  hasAnyPermission,   // (perms: string[]) => boolean
  hasAllPermissions,  // (perms: string[]) => boolean
  hasRole,            // (role: string) => boolean
  scopeIncludes,      // (scope: string) => boolean
} = useAuthorization();
```

### 14.3 `<Can>` Component

Conditionally renders children based on permission.

```tsx
<Can permission="patients.create">
  <Button onClick={openCreateModal}>New Patient</Button>
</Can>

<Can permission="billing.export" fallback={<span>Export unavailable</span>}>
  <Button onClick={exportBilling}>Export</Button>
</Can>
```

### 14.4 `<ProtectedRoute>` Component

Blocks entire routes.

```tsx
<Route path="/hr" element={
  <ProtectedRoute permission="hr.view">
    <HrPage />
  </ProtectedRoute>
} />
```

### 14.5 filterMenu()

Filters sidebar menu items by permission.

```typescript
const menuItems = [
  { label: 'Patients', path: '/patients', permission: 'patients.view' },
  { label: 'Billing', path: '/billing', permission: 'billing.view' },
  { label: 'HR', path: '/hr', permission: 'hr.view' },
  { label: 'Settings', path: '/settings', permission: 'settings.manage' },
];

const visibleMenu = filterMenu(menuItems, hasPermission);
// Doctor sees: Patients, Billing (if permitted)
// HR Manager sees: HR, Settings
// Receptionist sees: Patients, Billing
```

### 14.6 Frontend Rules

1. **Frontend permission checks are UI-only.** They control visibility.
2. **Backend is the authorization authority.** Every endpoint enforces permissions.
3. **Never send API requests for data the user shouldn't see,** even though the backend will reject them. This reduces noise and improves UX.
4. **Loading states** — show skeleton or spinner while authorization context loads.
5. **Denied states** — show "Access Denied" message, not a blank page.

---

## 15. Protected Operations

**Every data-returning or data-modifying operation must go through `authorize()`.**

This includes but is not limited to:

| Operation Type | Example Endpoints |
|---------------|-------------------|
| CRUD | `GET /patients`, `POST /patients`, `PUT /patients/:id`, `DELETE /patients/:id` |
| Search | `GET /patients/search?q=ahmed` |
| List | `GET /appointments?page=1&limit=10` |
| View | `GET /patients/:id` |
| Export | `GET /patients/export?format=csv` |
| Print | `GET /patients/:id/print` |
| Download | `GET /documents/:id/download` |
| Reports | `GET /reports/revenue?period=this_month` |
| Dashboard | `GET /dashboard/stats` |
| Aggregates | `GET /billing/summary` |
| Bulk ops | `POST /patients/bulk-import` |
| Approvals | `POST /insurance-claims/:id/approve` |
| Financial | `POST /billing/payments` |
| Audit | `GET /audit-logs` |

### 15.1 Example: Export Endpoint

```typescript
app.get('/api/v1/patients/export',
  {
    preHandler: [
      authenticate,
      authorize({ permission: 'patients.export' }),  // ← MUST be here
    ],
  },
  async (request, reply) => {
    // Scope is already resolved and attached to request
    const constraint = applyScopeConstraint(request.scope, request.scopeContext);
    const patients = await db('patients')
      .where('tenant_id', request.tenantId)
      .where(constraint);
    // Generate CSV...
  }
);
```

### 15.2 Example: Dashboard

```typescript
app.get('/api/v1/dashboard/stats',
  {
    preHandler: [
      authenticate,
      authorize({ permission: 'dashboard.view' }),
    ],
  },
  async (request, reply) => {
    const scope = applyScopeConstraint(request.scope, request.scopeContext);
    const stats = {
      totalPatients: await db('patients').where('tenant_id', request.tenantId).where(scope).count('id as c').first(),
      todayAppointments: await db('appointments').where('tenant_id', request.tenantId).where(scope).count('id as c').first(),
      // ... all queries scoped
    };
    return sendSuccess(reply, stats);
  }
);
```

---

## 16. The 39 System Role Templates

### 16.1 Platform Roles (system scope)

| # | Role | Default Scope | Key Permissions |
|---|------|---------------|-----------------|
| 1 | Platform Super Administrator | `system` | `*` (all) |

### 16.2 Tenant Administration Roles

| # | Role | Default Scope | Key Permissions |
|---|------|---------------|-----------------|
| 2 | Tenant Administrator | `tenant` | `*` within tenant |
| 3 | IT Administrator | `tenant` | `settings.manage`, `users.*`, `audit.view` |
| 4 | Compliance Officer | `tenant` | `audit.view`, `compliance.*` |
| 5 | Internal Auditor | `tenant` | `audit.view`, `reports.view` |

### 16.3 Management Roles

| # | Role | Default Scope | Key Permissions |
|---|------|---------------|-----------------|
| 6 | Branch Manager | `branch` | Branch-level admin + clinical overview |
| 7 | Medical Director | `tenant` | `clinical.*`, `emr.*`, `reports.view` |
| 8 | Department Manager | `department` | Department-level admin + staff |
| 9 | Hospital Administrator | `tenant` | Operations + performance |
| 10 | Quality Manager | `tenant` | `compliance.*`, `reports.view` |

### 16.4 Clinical Roles

| # | Role | Default Scope | Key Permissions |
|---|------|---------------|-----------------|
| 11 | Doctor | `assigned_patients` | `patients.*`, `emr.*`, `prescriptions.*` |
| 12 | Resident / Trainee Doctor | `assigned_patients` | `patients.view`, `emr.view`, `emr.create` |
| 13 | External Consultant | `assigned_patients` | `patients.view`, `emr.view` |
| 14 | Nurse | `department` | `patients.view`, `nursing.*`, `emr.view` |
| 15 | Nurse Manager | `branch` | `nursing.*`, `hr.view` |

### 16.5 Front Desk & Coordination Roles

| # | Role | Default Scope | Key Permissions |
|---|------|---------------|-----------------|
| 16 | Receptionist | `branch` | `patients.*`, `appointments.*`, `billing.view` |
| 17 | Appointment Coordinator | `branch` | `appointments.*`, `patients.view` |
| 18 | Call Center Agent | `branch` | `patients.view`, `appointments.view` |
| 19 | Medical Records Officer | `tenant` | `emr.*`, `dms.*` |
| 20 | Customer Service Officer | `tenant` | `patients.view`, `complaints.*` |

### 16.6 Clinical Support Roles

| # | Role | Default Scope | Key Permissions |
|---|------|---------------|-----------------|
| 21 | Pharmacist | `branch` | `pharmacy.*`, `patients.view` |
| 22 | Laboratory Staff | `branch` | `laboratory.*`, `patients.view` |
| 23 | Laboratory Supervisor | `branch` | `laboratory.*`, `reports.view` |
| 24 | Radiology Staff / Technician | `branch` | `radiology.*`, `patients.view` |
| 25 | Radiologist | `branch` | `radiology.*`, `patients.view`, `emr.view` |

### 16.7 Financial Roles

| # | Role | Default Scope | Key Permissions |
|---|------|---------------|-----------------|
| 26 | Billing Officer | `branch` | `billing.*`, `patients.view` |
| 27 | Finance / Accountant | `tenant` | `billing.*`, `expenses.*`, `reports.view` |
| 28 | Insurance Officer | `tenant` | `insurance.*`, `insurance_claims.*`, `patients.view` |
| 29 | Payroll Officer | `tenant` | `hr.payroll`, `reports.view` |

### 16.8 Operations Roles

| # | Role | Default Scope | Key Permissions |
|---|------|---------------|-----------------|
| 30 | HR Manager | `tenant` | `hr.*`, `reports.view` |
| 31 | HR Staff | `tenant` | `hr.view`, `hr.create`, `hr.edit` |
| 32 | Inventory Manager | `tenant` | `inventory.*`, `reports.view` |
| 33 | Storekeeper | `branch` | `inventory.view`, `inventory.edit` |
| 34 | Procurement Officer | `tenant` | `inventory.*`, `reports.view` |
| 35 | Biomedical / Equipment Technician | `branch` | `inventory.view`, `workflow.*` |

### 16.9 Portal & External Roles

| # | Role | Default Scope | Key Permissions |
|---|------|---------------|-----------------|
| 36 | Patient | `self` | `portal.*` (own data only) |
| 37 | Guardian / Parent | `self` | `portal.*` (dependent data) |
| 38 | Vendor / Supplier User | `self` | `procurement.view` (own supplier) |
| 39 | Guest / Limited External User | `self` | Explicitly assigned only |

---

## 17. Direct Permissions & Denials

### 17.1 Purpose

Allow administrators to grant or deny specific permissions to individual
users beyond what their role provides.

### 17.2 Resolution

```
Effective =
  RolePermissions ∪ DirectAllow − DirectDeny
```

### 17.3 Example

Doctor role grants:
- `patients.view` ✅
- `patients.update` ✅
- `patients.export` ✅

Specific doctor direct permission:
- `patients.export` = **DENY**

Final result:
- `patients.view` = ALLOW
- `patients.update` = ALLOW
- `patients.export` = **DENY**

### 17.4 Use Cases

- Revoke export access from a specific doctor for data privacy
- Grant additional permissions to a senior nurse beyond their role
- Temporarily escalate permissions for a specific task
- Restrict a user's access within their role for compliance

---

## 18. Wildcard Resolution

### 18.1 Hierarchy

```
*                         → All permissions
├── patients.*            → All patient permissions
│   ├── patients.view
│   ├── patients.create
│   ├── patients.edit
│   ├── patients.delete
│   └── patients.export
├── billing.*             → All billing permissions
│   ├── billing.view
│   ├── billing.create
│   └── ...
└── ...
```

### 18.2 Resolution Rules

1. Check exact permission first: `patients.export`
2. Check module wildcard: `patients.*`
3. Check global wildcard: `*`
4. Check explicit deny: `patients.export = DENY` → deny regardless of wildcards

### 18.3 Implementation

```typescript
function hasPermission(
  effective: Map<string, Effect>,
  requested: string
): boolean {
  // 1. Exact match
  if (effective.has(requested)) {
    return effective.get(requested) === 'allow';
  }

  // 2. Module wildcard
  const module = requested.split('.')[0];
  if (effective.has(`${module}.*`)) {
    return effective.get(`${module}.*`) === 'allow';
  }

  // 3. Global wildcard
  if (effective.has('*')) {
    return effective.get('*') === 'allow';
  }

  return false;
}
```

---

## 19. Multi-Tenant & Multi-Branch Users

### 19.1 Login Flow

```
1. User logs in with email + password
2. Backend returns list of active memberships:
   [
     { id: "m1", tenant: "Hospital A", branch: "Cairo", dept: "Ophthalmology" },
     { id: "m2", tenant: "Hospital A", branch: "Giza", dept: "Ophthalmology" },
     { id: "m3", tenant: "Hospital B", branch: "Alexandria", dept: "Ophthalmology" }
   ]
3. User selects membership → "m1"
4. Backend issues JWT: { sub: user_id, mid: "m1", sid: session_id, authz_version: 17 }
5. All subsequent requests use this JWT
```

### 19.2 Context Switching

```
1. User clicks "Switch Branch" → selects "m2"
2. Frontend calls POST /auth/switch-membership { membershipId: "m2" }
3. Backend:
   a. Verifies user owns membership "m2"
   b. Creates new session with new JWT: { mid: "m2", ... }
   c. Returns new access token
4. Frontend stores new JWT, reloads authorization context
5. Sidebar updates to show branch-appropriate links
```

### 19.3 Role Isolation

Each membership can have different roles:

- Membership 1 (Cairo): Role = "Doctor" (clinical access)
- Membership 2 (Giza): Role = "Department Head" (clinical + admin)
- Membership 3 (Hospital B): Role = "Consultant" (limited clinical)

---

## 20. Security Rules

### 20.1 Non-Negotiable Rules

1. **JWT never contains authorization data.** Only identity + membership reference.
2. **Backend is the sole authorization authority.** Frontend checks are cosmetic.
3. **Every data endpoint enforces permission + scope.** No exceptions.
4. **Never trust client-supplied tenant_id, branch_id, or department_id.** Always resolve from membership.
5. **Explicit denials always override grants.** No role can bypass a denial.
6. **Cache invalidation is immediate** when authorization data changes.
7. **Permission versioning prevents stale access.** JWT version must match DB version.
8. **Audit all authorization failures.** Log who tried what and why it was denied.
9. **Membership suspension immediately revokes access.** All sessions for that membership are invalidated.
10. **Scope never exceeds the user's highest role scope.** A user cannot request a broader scope than their roles provide.

### 20.2 Audit Requirements

Log every:
- Successful authorization check (for sensitive operations)
- Failed authorization check (always)
- Membership change
- Role assignment change
- Permission grant/deny
- Scope escalation attempt
- Session creation/invalidation

---

## 21. Implementation Phases

### Phase 1: Membership Table + JWT Refactor
- Create `memberships` table
- Migrate existing user-tenant assignments
- Refactor JWT to carry only `user_id` + `membership_id` + `session_id`
- Update `loadUserPrincipal()` to resolve from membership
- Update all route handlers to use new context

### Phase 2: Effective Permission Resolution
- Implement `resolveEffectivePermissions()` with role + direct + deny
- Add caching layer (Redis)
- Implement cache invalidation triggers
- Add permission versioning

### Phase 3: Scope Engine
- Create `applyScopeConstraint()` helper
- Define scope policies for each module
- Apply scope constraints to ALL list/search/export/report endpoints
- Add scope validation in `authorize()`

### Phase 4: Frontend Authorization
- Create `AuthorizationProvider`
- Create `useAuthorization()` hook
- Create `<Can>` component
- Create `<ProtectedRoute>` component
- Create `filterMenu()` utility
- Update sidebar to be permission-driven
- Add loading/denied states

### Phase 5: 39 Role Templates
- Add remaining 24 role templates to `SEED_ROLES`
- Ensure each template has correct permissions + scope
- Verify all role combinations work correctly
- Test tenant customization flow

### Phase 6: Hardening
- Add RLS (Row Level Security) as additional defense layer
- Penetration testing
- Load testing authorization cache
- Audit log review
- Documentation

---

## Appendix A: Scope Comparison Matrix

| Module | self | assigned | department | branch | branches | tenant | system |
|--------|------|----------|------------|--------|----------|--------|--------|
| Patients | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Appointments | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| EMR | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Billing | ✅ | — | — | ✅ | ✅ | ✅ | ✅ |
| Insurance | — | — | — | ✅ | ✅ | ✅ | ✅ |
| HR | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inventory | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pharmacy | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Laboratory | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Radiology | — | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reports | — | — | — | ✅ | ✅ | ✅ | ✅ |
| Audit Logs | — | — | — | ✅ | ✅ | ✅ | ✅ |
| Settings | — | — | — | — | — | ✅ | ✅ |

---

*This document is the single source of truth for the Hospital ERP authorization
architecture. All implementation must conform to these specifications.*
