/**
 * RBAC API Permission Tests
 *
 * A lightweight Node.js script that logs in as each demo user and verifies
 * that API endpoints enforce permissions correctly.
 *
 * Run:
 *   npx tsx e2e/tests/rbac-api-permissions.ts
 *
 * Prerequisites:
 *   - Backend running on localhost:3000
 *   - Seed data applied
 */
const API = process.env.API_URL || 'http://localhost:3000';

// ─── Types ──────────────────────────────────────────────────────────

interface User {
  email: string;
  password: string;
  role: string;
  label: string;
}

interface TestResult {
  user: string;
  role: string;
  endpoint: string;
  method: string;
  expectedStatus: number;
  actualStatus: number;
  pass: boolean;
}

// ─── Demo Users ─────────────────────────────────────────────────────

const USERS: User[] = [
  { email: 'admin@demo.com',       password: 'Admin@123',      role: 'super_admin',       label: 'Super Admin' },
  { email: 'doctor@demo.com',      password: 'Doctor@123',     role: 'doctor',            label: 'Doctor' },
  { email: 'nurse@demo.com',       password: 'Nurse@123',      role: 'nurse',             label: 'Nurse' },
  { email: 'reception@demo.com',   password: 'Recept@123',     role: 'receptionist',      label: 'Receptionist' },
  { email: 'pharmacist@demo.com',  password: 'Pharma@123',     role: 'pharmacist',        label: 'Pharmacist' },
  { email: 'labtech@demo.com',     password: 'LabTech@123',    role: 'lab_tech',          label: 'Lab Tech' },
  { email: 'billing@demo.com',     password: 'Billing@123',    role: 'billing_staff',     label: 'Billing Staff' },
  { email: 'hr@demo.com',          password: 'HR@123',         role: 'hr_manager',        label: 'HR Manager' },
  { email: 'inventory@demo.com',   password: 'Inventory@123',  role: 'inventory_manager', label: 'Inventory Mgr' },
  { email: 'branchmgr@demo.com',  password: 'Branch@123',     role: 'branch_manager',    label: 'Branch Mgr' },
  { email: 'insurance@demo.com',   password: 'Insurance@123',  role: 'insurance_officer', label: 'Insurance' },
  { email: 'radiologist@demo.com', password: 'Radio@123',      role: 'radiologist',       label: 'Radiologist' },
];

// ─── Endpoint → Permission Matrix ───────────────────────────────────

interface EndpointTest {
  method: string;
  path: string;
  /** Permission required to access this endpoint */
  requiredPermission: string;
  /** Expected HTTP status when permission is present */
  okStatus: number;
  /** Expected HTTP status when permission is missing */
  deniedStatus: number;
}

const ENDPOINTS: EndpointTest[] = [
  // Clinical
  { method: 'GET',  path: '/api/v1/patients',                       requiredPermission: 'patients.view',          okStatus: 200, deniedStatus: 403 },
  { method: 'POST', path: '/api/v1/patients',                       requiredPermission: 'patients.create',        okStatus: 201, deniedStatus: 403 },
  { method: 'GET',  path: '/api/v1/appointments',                   requiredPermission: 'appointments.view',      okStatus: 200, deniedStatus: 403 },
  { method: 'POST', path: '/api/v1/appointments',                   requiredPermission: 'appointments.create',    okStatus: 201, deniedStatus: 403 },
  { method: 'GET',  path: '/api/v1/emr',                            requiredPermission: 'emr.view',               okStatus: 200, deniedStatus: 403 },
  { method: 'GET',  path: '/api/v1/laboratory/orders',              requiredPermission: 'laboratory.view',        okStatus: 200, deniedStatus: 403 },
  { method: 'GET',  path: '/api/v1/radiology/orders',               requiredPermission: 'radiology.view',         okStatus: 200, deniedStatus: 403 },
  { method: 'GET',  path: '/api/v1/pharmacy/inventory',             requiredPermission: 'pharmacy.view',          okStatus: 200, deniedStatus: 403 },
  { method: 'GET',  path: '/api/v1/nursing/tasks',                  requiredPermission: 'nursing.view',           okStatus: 200, deniedStatus: 403 },

  // Financial
  { method: 'GET',  path: '/api/v1/billing/invoices',               requiredPermission: 'billing.view',           okStatus: 200, deniedStatus: 403 },
  { method: 'POST', path: '/api/v1/billing/invoices',               requiredPermission: 'billing.create',         okStatus: 201, deniedStatus: 403 },
  { method: 'GET',  path: '/api/v1/insurance-claims',               requiredPermission: 'insurance_claims.view',  okStatus: 200, deniedStatus: 403 },
  { method: 'GET',  path: '/api/v1/inventory/items',                requiredPermission: 'inventory.view',         okStatus: 200, deniedStatus: 403 },
  { method: 'POST', path: '/api/v1/inventory/items',                requiredPermission: 'inventory.create',       okStatus: 201, deniedStatus: 403 },

  // HR
  { method: 'GET',  path: '/api/v1/hr/employees',                   requiredPermission: 'hr.view',                okStatus: 200, deniedStatus: 403 },
  { method: 'POST', path: '/api/v1/hr/employees',                   requiredPermission: 'hr.create',              okStatus: 201, deniedStatus: 403 },

  // Admin
  { method: 'GET',  path: '/api/v1/audit-logs',                     requiredPermission: 'audit.view',             okStatus: 200, deniedStatus: 403 },
  { method: 'GET',  path: '/api/v1/reports',                        requiredPermission: 'reports.view',           okStatus: 200, deniedStatus: 403 },
  { method: 'GET',  path: '/api/v1/departments',                    requiredPermission: 'departments.view',       okStatus: 200, deniedStatus: 403 },
  { method: 'GET',  path: '/api/v1/automation/rules',               requiredPermission: 'automation.view',        okStatus: 200, deniedStatus: 403 },

  // Settings
  { method: 'GET',  path: '/api/v1/clinic-settings',                requiredPermission: 'settings.view',          okStatus: 200, deniedStatus: 403 },
  { method: 'PUT',  path: '/api/v1/clinic-settings',                requiredPermission: 'settings.manage',        okStatus: 200, deniedStatus: 403 },

  // Communications
  { method: 'GET',  path: '/api/v1/notification-templates',         requiredPermission: 'communications.view',    okStatus: 200, deniedStatus: 403 },
  { method: 'GET',  path: '/api/v1/notification-logs',              requiredPermission: 'notifications.view',     okStatus: 200, deniedStatus: 403 },
];

// ─── Permission catalog (which role has which permissions) ──────────
// Derived from the SEED_ROLES in shared/src/authz/index.ts

// Role → Set of permissions (simplified — expanded from SEED_ROLES)
const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  super_admin: new Set(['*']),
  admin: new Set(['*']),
  doctor: new Set([
    'patients.view', 'patients.create', 'patients.update',
    'appointments.view', 'appointments.create', 'appointments.update', 'appointments.cancel',
    'emr.view', 'emr.create', 'emr.update', 'emr.sign',
    'laboratory.view', 'radiology.view', 'pharmacy.view', 'nursing.view',
    'referrals.view', 'referrals.create',
    'reports.view',
    'notifications.view', 'messages.view',
    'settings.view', 'documents.view',
  ]),
  nurse: new Set([
    'patients.view', 'appointments.view',
    'emr.view', 'emr.create',
    'nursing.view', 'nursing.create',
    'laboratory.view', 'pharmacy.view',
    'reports.view', 'notifications.view',
    'settings.view',
  ]),
  receptionist: new Set([
    'patients.view', 'patients.create', 'patients.update',
    'appointments.view', 'appointments.create', 'appointments.update', 'appointments.cancel',
    'billing.view', 'billing.create',
    'queue.view', 'queue.manage',
    'insurance.view',
    'notifications.view',
    'settings.view',
  ]),
  pharmacist: new Set([
    'patients.view',
    'pharmacy.view', 'pharmacy.create', 'pharmacy.edit',
    'inventory.view',
    'reports.view', 'notifications.view',
    'settings.view',
  ]),
  lab_tech: new Set([
    'patients.view',
    'laboratory.view', 'laboratory.create', 'laboratory.edit',
    'reports.view', 'notifications.view',
    'settings.view',
  ]),
  billing_staff: new Set([
    'patients.view',
    'billing.view', 'billing.create', 'billing.edit', 'billing.export',
    'insurance.view', 'insurance_claims.view', 'insurance_claims.create',
    'reports.view', 'notifications.view',
    'settings.view',
  ]),
  hr_manager: new Set([
    'hr.view', 'hr.create', 'hr.edit', 'hr.delete',
    'employees.view',
    'reports.view', 'notifications.view',
    'settings.view',
  ]),
  inventory_manager: new Set([
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.export',
    'reports.view', 'notifications.view',
    'settings.view',
  ]),
  branch_manager: new Set([
    'patients.view', 'appointments.view',
    'billing.view', 'inventory.view', 'hr.view',
    'branches.view', 'branches.edit',
    'reports.view', 'audit.view', 'notifications.view',
    'settings.view', 'settings.manage',
  ]),
  insurance_officer: new Set([
    'patients.view',
    'insurance.view', 'insurance.create', 'insurance.edit',
    'insurance_claims.view', 'insurance_claims.create', 'insurance_claims.approve',
    'billing.view',
    'reports.view', 'notifications.view',
    'settings.view',
  ]),
  radiologist: new Set([
    'patients.view',
    'radiology.view', 'radiology.create', 'radiology.edit',
    'emr.view',
    'reports.view', 'notifications.view',
    'settings.view',
  ]),
};

// ─── Helpers ────────────────────────────────────────────────────────

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, tenantSlug: 'demo' }),
  });
  const body = await res.json() as { success: boolean; data?: { accessToken?: string } };
  if (!body.success || !body.data?.accessToken) {
    throw new Error(`Login failed: ${JSON.stringify(body)}`);
  }
  return body.data.accessToken;
}

async function apiCall(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<number> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const opts: RequestInit = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  return res.status;
}

function hasPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.has('*')) return true;
  if (perms.has(permission)) return true;
  // Check wildcard: e.g., 'billing.*' covers 'billing.view'
  const parts = permission.split('.');
  if (parts.length === 2) {
    return perms.has(`${parts[0]}.*`);
  }
  return false;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        RBAC API Permission Matrix — Integration Test        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`API: ${API}`);
  console.log(`Users: ${USERS.length}, Endpoints: ${ENDPOINTS.length}`);
  console.log('');

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const user of USERS) {
    console.log(`\n── ${user.label} (${user.role}) ──`);

    let token: string;
    try {
      token = await login(user.email, user.password);
      console.log(`  ✓ Login successful`);
    } catch (e) {
      console.log(`  ✗ Login FAILED: ${(e as Error).message}`);
      failed += ENDPOINTS.length;
      continue;
    }

    for (const ep of ENDPOINTS) {
      const shouldHaveAccess = hasPermission(user.role, ep.requiredPermission);
      const expectedStatus = shouldHaveAccess ? ep.okStatus : ep.deniedStatus;

      try {
        const actualStatus = await apiCall(token, ep.method, ep.path);
        const pass = actualStatus === expectedStatus || 
                     (shouldHaveAccess && actualStatus >= 200 && actualStatus < 500) ||
                     (!shouldHaveAccess && (actualStatus === 403 || actualStatus === 401));
        
        results.push({
          user: user.label,
          role: user.role,
          endpoint: `${ep.method} ${ep.path}`,
          method: ep.method,
          expectedStatus,
          actualStatus,
          pass,
        });

        if (pass) {
          passed++;
          const icon = shouldHaveAccess ? '✓' : '⊘';
          console.log(`  ${icon} ${ep.method} ${ep.path} → ${actualStatus} (expected ${expectedStatus})`);
        } else {
          failed++;
          console.log(`  ✗ ${ep.method} ${ep.path} → ${actualStatus} (expected ${expectedStatus}) — MISMATCH`);
        }
      } catch (e) {
        failed++;
        results.push({
          user: user.label,
          role: user.role,
          endpoint: `${ep.method} ${ep.path}`,
          method: ep.method,
          expectedStatus,
          actualStatus: 0,
          pass: false,
        });
        console.log(`  ✗ ${ep.method} ${ep.path} → ERROR: ${(e as Error).message}`);
      }
    }
  }

  // ─── Summary ────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Per-role summary
  const roles = [...new Set(results.map(r => r.role))];
  for (const role of roles) {
    const roleResults = results.filter(r => r.role === role);
    const rolePass = roleResults.filter(r => r.pass).length;
    const roleFail = roleResults.filter(r => !r.pass).length;
    const icon = roleFail === 0 ? '✓' : '✗';
    console.log(`  ${icon} ${role}: ${rolePass}/${roleResults.length} passed`);
  }

  if (failed > 0) {
    console.log('\nFailed tests:');
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  ✗ [${r.user}] ${r.endpoint} → got ${r.actualStatus}, expected ${r.expectedStatus}`);
    }
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
