/**
 * Authorization catalog — single source of truth for permissions, scopes,
 * and seed roles (see docs/engineering/AUTHORIZATION.md).
 *
 * Every authorization decision is a (permission, scope) pair. Permissions are
 * `module.action` keys. Roles are only a packaging mechanism for grants.
 */

export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'reject',
  'export',
  'print',
  'download',
  'manage',
  'assign',
  'cancel',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_SCOPES = [
  'self',
  'assigned_patients',
  'department',
  'branch',
  'branches',
  'tenant',
  'system',
] as const;

export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export interface Grant {
  permission: string; // module.action | '*'
  scope: PermissionScope;
}

export interface RoleTemplate {
  level: 'system' | 'tenant' | 'branch' | 'custom';
  scopeDefault: PermissionScope;
  description?: string;
  /** permission key -> scopes. Supports '*' (all modules) and 'module.*' wildcards. */
  grants: Record<string, readonly PermissionScope[]>;
}

const ALL_ACTIONS: readonly PermissionAction[] = [...PERMISSION_ACTIONS];

/**
 * Module -> actions available for that module.
 * Kept in sync with the authorization matrix in docs/engineering/AUTHORIZATION.md.
 */
export const PERMISSION_CATALOG: Record<string, readonly PermissionAction[]> = {
  patients: ['view', 'create', 'edit', 'delete', 'approve', 'export', 'manage'],
  departments: ['view', 'create', 'edit', 'delete', 'manage'],
  appointments: ['view', 'create', 'edit', 'delete', 'cancel', 'approve', 'export', 'manage'],
  emr: ['view', 'create', 'edit', 'approve', 'export', 'print', 'manage'],
  queue: ['view', 'edit', 'manage'],
  referrals: ['view', 'create', 'edit', 'manage'],
  nursing: ['view', 'create', 'edit', 'manage'],
  home_visits: ['view', 'create', 'edit', 'manage'],
  telemedicine: ['view', 'create', 'edit', 'manage'],
  laboratory: ['view', 'create', 'edit', 'approve', 'reject', 'print', 'export', 'manage'],
  radiology: ['view', 'create', 'edit', 'approve', 'reject', 'print', 'export', 'manage'],
  pharmacy: ['view', 'create', 'edit', 'approve', 'reject', 'print', 'export', 'manage'],
  billing: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'cancel', 'export', 'print', 'manage'],
  insurance: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'cancel', 'export', 'manage'],
  insurance_claims: ['view', 'create', 'edit', 'approve', 'reject', 'export', 'manage'],
  eta_invoicing: ['view', 'create', 'edit', 'export', 'manage'],
  expenses: ['view', 'create', 'edit', 'delete', 'export', 'manage'],
  inventory: ['view', 'create', 'edit', 'delete', 'export', 'manage'],
  hr: ['view', 'create', 'edit', 'delete', 'export', 'manage'],
  crm: ['view', 'create', 'edit', 'delete', 'export', 'manage'],
  dms: ['view', 'create', 'edit', 'delete', 'export', 'manage'],
  workflow: ['view', 'create', 'edit', 'delete', 'export', 'manage'],
  forms: ['view', 'create', 'edit', 'delete', 'export', 'manage'],
  compliance: ['view', 'create', 'edit', 'delete', 'export', 'manage'],
  automation: ['view', 'create', 'edit', 'delete', 'export', 'manage'],
  integrations: ['view', 'create', 'edit', 'export', 'manage'],
  bi: ['view', 'export', 'print', 'manage'],
  reports: ['view', 'export', 'print', 'manage'],
  financial_reports: ['view', 'export', 'print', 'manage'],
  compliance_reports: ['view', 'export', 'print', 'manage'],
  advanced_reporting: ['view', 'export', 'print', 'manage'],
  analytics_dashboard: ['view', 'export', 'manage'],
  ai_hub: ['view', 'create', 'manage'],
  clinical_ai: ['view', 'create', 'manage'],
  predictive_analytics: ['view', 'manage'],
  smart_scheduling: ['view', 'create', 'manage'],
  notifications: ['view', 'create', 'manage'],
  communications: ['view', 'create', 'edit', 'delete', 'manage'],
  whatsapp: ['view', 'create', 'edit', 'delete', 'manage'],
  voice_calls: ['view', 'create', 'manage'],
  patient_messages: ['view', 'create', 'edit', 'delete', 'manage'],
  chat: ['view', 'create', 'edit', 'delete', 'manage'],
  patient_portal: ['view', 'manage'],
  online_booking: ['view', 'manage'],
  patient_self_service: ['view', 'manage'],
  users: ['view', 'create', 'edit', 'delete', 'assign', 'manage'],
  roles: ['view', 'create', 'edit', 'delete', 'assign', 'manage'],
  audit: ['view', 'export', 'manage'],
  sessions: ['view', 'delete', 'manage'],
  system_monitor: ['view', 'export', 'manage'],
  settings: ['view', 'edit', 'manage'],
  branches: ['view', 'create', 'edit', 'delete', 'manage'],
  regions: ['view', 'create', 'edit', 'delete', 'manage'],
  saas_billing: ['view', 'export', 'manage'],
  white_label: ['view', 'edit', 'manage'],
  dr_backup: ['view', 'create', 'manage'],
  barcodes: ['view', 'create', 'export', 'manage'],
  data_warehouse: ['view', 'export', 'manage'],
  api_keys: ['view', 'create', 'edit', 'delete', 'manage'],
  developer_portal: ['view', 'export', 'manage'],
  data_export: ['view', 'create', 'export', 'manage'],
  bulk_import: ['view', 'create', 'manage'],
  documents: ['view', 'create', 'edit', 'delete', 'download', 'print', 'manage'],
  emergency_access: ['manage'],
};

export const PERMISSION_MODULES: readonly string[] = Object.keys(PERMISSION_CATALOG);

export function permissionKey(module: string, action: string): string {
  return `${module}.${action}`;
}

export function allPermissionKeys(): string[] {
  const keys: string[] = [];
  for (const [module, actions] of Object.entries(PERMISSION_CATALOG)) {
    for (const action of actions) keys.push(permissionKey(module, action));
  }
  return keys;
}

/** Expand a grant key ('*', 'module.*', or 'module.action') into concrete keys. */
export function expandGrantKey(key: string): string[] {
  if (key === '*') return allPermissionKeys();
  const dot = key.indexOf('.');
  const module = dot === -1 ? key : key.slice(0, dot);
  const action = dot === -1 ? '' : key.slice(dot + 1);
  const actions = PERMISSION_CATALOG[module];
  if (!actions) return [];
  if (!action || action === '*') return actions.map((a) => permissionKey(module, a));
  return [permissionKey(module, action)];
}

export function expandRoleGrants(template: RoleTemplate): Grant[] {
  const grants: Grant[] = [];
  for (const [key, scopes] of Object.entries(template.grants)) {
    for (const permission of expandGrantKey(key)) {
      for (const scope of scopes) grants.push({ permission, scope });
    }
  }
  return grants;
}

/**
 * Normalize legacy permission keys to the current catalog.
 * Handles both 'module.action' and legacy 'module:action' formats and maps
 * read/update/import onto the current action set.
 */
const LEGACY_ACTION_MAP: Record<string, string> = {
  read: 'view',
  write: 'create',
  update: 'edit',
  remove: 'delete',
  import: 'create',
};

export function normalizeLegacyPermission(key: string): string {
  const k = key.trim();
  if (!k || k === '*') return k;
  const sep = k.includes(':') ? ':' : '.';
  const dot = k.indexOf(sep);
  if (dot === -1) return k;
  const module = k.slice(0, dot);
  const action = k.slice(dot + 1);
  if (!module || !action) return k;
  if (action === '*') return `${module}.*`;
  return `${module}.${LEGACY_ACTION_MAP[action] || action}`;
}

/** Seed roles (system/tenant/branch) with their grant matrix. */
export const SEED_ROLES: Record<string, RoleTemplate> = {
  // ════════════════════════════════════════════════════════════════
  // PLATFORM (cross-tenant)
  // ════════════════════════════════════════════════════════════════
  super_admin: {
    level: 'system',
    scopeDefault: 'system',
    description: 'Full system-wide access across all tenants',
    grants: { '*': ['system'] },
  },

  // ════════════════════════════════════════════════════════════════
  // TENANT ADMINISTRATION
  // ════════════════════════════════════════════════════════════════
  admin: {
    level: 'system',
    scopeDefault: 'tenant',
    description: 'Tenant administrator — full access within the tenant',
    grants: { '*': ['tenant'] },
  },

  it_administrator: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'Technical infrastructure: system config, integrations, backups, monitoring',
    grants: {
      'settings.*': ['tenant'],
      'system_monitor.*': ['tenant'],
      'integrations.*': ['tenant'],
      'api_keys.*': ['tenant'],
      'dr_backup.*': ['tenant'],
      'developer_portal.*': ['tenant'],
      'sessions.*': ['tenant'],
      'users.view': ['tenant'],
    },
  },

  compliance_officer: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'Regulatory compliance: external audits, incident reports, compliance reports',
    grants: {
      'compliance.*': ['tenant'],
      'compliance_reports.*': ['tenant'],
      'emergency_access.manage': ['tenant'],
      'audit.view': ['tenant'],
      'audit.export': ['tenant'],
      'patients.view': ['tenant'],
      'emr.view': ['tenant'],
    },
  },

  internal_auditor: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'Internal audits: financial + clinical review, read-heavy, export-focused',
    grants: {
      'audit.*': ['tenant'],
      'reports.export': ['tenant'],
      'financial_reports.export': ['tenant'],
      'billing.view': ['tenant'],
      'billing.export': ['tenant'],
      'hr.view': ['tenant'],
      'hr.export': ['tenant'],
      'inventory.view': ['tenant'],
      'inventory.export': ['tenant'],
    },
  },

  // ════════════════════════════════════════════════════════════════
  // MANAGEMENT
  // ════════════════════════════════════════════════════════════════
  branch_manager: {
    level: 'tenant',
    scopeDefault: 'branch',
    description: 'Branch-level operations: overview of all clinical + admin at branch scope',
    grants: {
      'patients.view': ['branch'],
      'appointments.view': ['branch'],
      'emr.view': ['branch'],
      'billing.view': ['branch'],
      'billing.export': ['branch'],
      'insurance.view': ['branch'],
      'inventory.view': ['branch'],
      'hr.view': ['branch'],
      'queue.view': ['branch'],
      'reports.view': ['branch'],
      'reports.export': ['branch'],
      'settings.view': ['branch'],
      'settings.manage': ['tenant'],
      'branches.view': ['tenant'],
      'departments.view': ['tenant'],
    },
  },

  medical_director: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'Clinical intelligence: AI insights, smart scheduling, clinical protocol oversight',
    grants: {
      'clinical_ai.*': ['tenant'],
      'smart_scheduling.*': ['tenant'],
      'predictive_analytics.*': ['tenant'],
      'patients.view': ['tenant'],
      'appointments.view': ['tenant'],
      'emr.approve': ['tenant'],
      'emr.view': ['tenant'],
      'laboratory.view': ['tenant'],
      'radiology.view': ['tenant'],
      'reports.view': ['tenant'],
    },
  },

  department_manager: {
    level: 'tenant',
    scopeDefault: 'department',
    description: 'Department staffing, scheduling, resources, and department-level KPIs',
    grants: {
      'patients.view': ['department'],
      'appointments.view': ['department'],
      'emr.view': ['department'],
      'hr.view': ['department'],
      'hr.create': ['department'],
      'inventory.view': ['department'],
      'reports.view': ['department'],
      'nursing.view': ['department'],
      'departments.edit': ['tenant'],
    },
  },

  quality_manager: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'Quality improvement: indicators, patient safety, corrective actions, complaints',
    grants: {
      'compliance.view': ['tenant'],
      'compliance.create': ['tenant'],
      'compliance.edit': ['tenant'],
      'compliance_reports.view': ['tenant'],
      'compliance_reports.export': ['tenant'],
      'crm.*': ['tenant'],
      'patients.view': ['tenant'],
      'emr.view': ['tenant'],
      'reports.view': ['tenant'],
    },
  },

  manager: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'Hospital administrator: operational analytics, BI dashboards, cross-module overview',
    grants: {
      'analytics_dashboard.*': ['tenant'],
      'bi.*': ['tenant'],
      'reports.view': ['tenant'],
      'reports.export': ['tenant'],
      'patients.view': ['tenant'],
      'appointments.view': ['tenant'],
      'emr.view': ['tenant'],
      'hr.view': ['tenant'],
      'billing.view': ['tenant'],
    },
  },

  // ════════════════════════════════════════════════════════════════
  // CLINICAL
  // ════════════════════════════════════════════════════════════════
  doctor: {
    level: 'tenant',
    scopeDefault: 'assigned_patients',
    description: 'Physician: full clinical access to assigned patients',
    grants: {
      'patients.view': ['assigned_patients'],
      'patients.edit': ['assigned_patients'],
      'appointments.view': ['assigned_patients'],
      'appointments.edit': ['assigned_patients'],
      'emr.*': ['assigned_patients'],
      'laboratory.view': ['assigned_patients'],
      'laboratory.print': ['assigned_patients'],
      'radiology.view': ['assigned_patients'],
      'pharmacy.view': ['assigned_patients'],
      'billing.view': ['assigned_patients'],
      'insurance.view': ['assigned_patients'],
      'chat.view': ['assigned_patients'],
      'chat.create': ['assigned_patients'],
      'documents.view': ['assigned_patients'],
      'documents.download': ['assigned_patients'],
    },
  },

  resident_doctor: {
    level: 'tenant',
    scopeDefault: 'assigned_patients',
    description: 'Trainee: supervised clinical access — no delete, no manage, no export',
    grants: {
      'patients.view': ['assigned_patients'],
      'patients.edit': ['assigned_patients'],
      'appointments.view': ['assigned_patients'],
      'appointments.edit': ['assigned_patients'],
      'emr.view': ['assigned_patients'],
      'emr.create': ['assigned_patients'],
      'emr.edit': ['assigned_patients'],
      'laboratory.view': ['assigned_patients'],
      'radiology.view': ['assigned_patients'],
    },
  },

  external_consultant: {
    level: 'tenant',
    scopeDefault: 'assigned_patients',
    description: 'Consultant: read-only specialist access — no create, no edit',
    grants: {
      'patients.view': ['assigned_patients'],
      'emr.view': ['assigned_patients'],
      'laboratory.view': ['assigned_patients'],
      'radiology.view': ['assigned_patients'],
      'appointments.view': ['assigned_patients'],
    },
  },

  nurse: {
    level: 'tenant',
    scopeDefault: 'department',
    description: 'Nursing care: vitals, medication admin, care plans, nursing notes',
    grants: {
      'patients.view': ['department'],
      'patients.edit': ['department'],
      'appointments.view': ['department'],
      'emr.view': ['department'],
      'emr.create': ['department'],
      'nursing.*': ['department'],
      'queue.view': ['department'],
      'queue.edit': ['department'],
      'laboratory.view': ['department'],
      'pharmacy.view': ['department'],
    },
  },

  nurse_manager: {
    level: 'tenant',
    scopeDefault: 'branch',
    description: 'Nursing operations: shift management, nurse scheduling, branch-level nursing KPIs',
    grants: {
      'nursing.*': ['branch'],
      'patients.view': ['branch'],
      'appointments.view': ['branch'],
      'emr.view': ['branch'],
      'hr.view': ['branch'],
      'hr.create': ['branch'],
      'laboratory.view': ['branch'],
      'pharmacy.view': ['branch'],
      'reports.view': ['branch'],
    },
  },

  // ════════════════════════════════════════════════════════════════
  // FRONT DESK & COORDINATION
  // ════════════════════════════════════════════════════════════════
  receptionist: {
    level: 'tenant',
    scopeDefault: 'branch',
    description: 'Full front desk: registration, check-in/out, scheduling, queue, billing create',
    grants: {
      'patients.*': ['branch'],
      'appointments.*': ['branch'],
      'billing.view': ['branch'],
      'billing.create': ['branch'],
      'queue.*': ['branch'],
      'insurance.view': ['branch'],
      'emr.view': ['branch'],
      'communications.view': ['branch'],
    },
  },

  appointment_coordinator: {
    level: 'tenant',
    scopeDefault: 'branch',
    description: 'Scheduling focus: appointments, provider schedules, waiting lists — no patient create/delete',
    grants: {
      'appointments.*': ['branch'],
      'patients.view': ['branch'],
      'referrals.view': ['branch'],
      'referrals.create': ['branch'],
      'queue.view': ['branch'],
      'queue.edit': ['branch'],
    },
  },

  call_center_agent: {
    level: 'tenant',
    scopeDefault: 'branch',
    description: 'Call center: voice calls, communications, basic appointment booking',
    grants: {
      'voice_calls.*': ['branch'],
      'communications.*': ['branch'],
      'patients.view': ['branch'],
      'appointments.view': ['branch'],
      'appointments.create': ['branch'],
    },
  },

  medical_records_officer: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'EMR administration: document control, release of information, record management',
    grants: {
      'emr.*': ['tenant'],
      'dms.*': ['tenant'],
      'documents.*': ['tenant'],
      'patients.view': ['tenant'],
      'audit.view': ['tenant'],
    },
  },

  customer_service_officer: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'Patient experience: complaints, feedback, satisfaction surveys, escalations',
    grants: {
      'crm.*': ['tenant'],
      'patients.view': ['tenant'],
      'appointments.view': ['tenant'],
      'communications.view': ['tenant'],
      'communications.create': ['tenant'],
      'reports.view': ['tenant'],
    },
  },

  // ════════════════════════════════════════════════════════════════
  // CLINICAL SUPPORT
  // ════════════════════════════════════════════════════════════════
  pharmacist: {
    level: 'tenant',
    scopeDefault: 'branch',
    description: 'Pharmacy ops: dispensing, prescription queue, stock, expiry management',
    grants: {
      'pharmacy.*': ['branch'],
      'patients.view': ['branch'],
      'emr.view': ['branch'],
      'inventory.view': ['branch'],
    },
  },

  lab_tech: {
    level: 'tenant',
    scopeDefault: 'department',
    description: 'Lab processing: sample collection, test execution — NO approve/reject',
    grants: {
      'laboratory.view': ['department'],
      'laboratory.create': ['department'],
      'laboratory.edit': ['department'],
      'laboratory.print': ['department'],
      'patients.view': ['department'],
      'emr.view': ['department'],
    },
  },

  laboratory_supervisor: {
    level: 'tenant',
    scopeDefault: 'branch',
    description: 'Full lab authority: approve/reject results, QC, lab reports, branch-level',
    grants: {
      'laboratory.*': ['branch'],
      'patients.view': ['branch'],
      'emr.view': ['branch'],
      'reports.view': ['branch'],
      'inventory.view': ['branch'],
    },
  },

  radiologist: {
    level: 'tenant',
    scopeDefault: 'department',
    description: 'Imaging interpretation: review studies, approve/reject, sign reports',
    grants: {
      'radiology.*': ['department'],
      'patients.view': ['department'],
      'emr.view': ['department'],
      'laboratory.view': ['department'],
    },
  },

  radiology_technician: {
    level: 'tenant',
    scopeDefault: 'department',
    description: 'Imaging procedures: perform scans, equipment ops — NO approve/reject',
    grants: {
      'radiology.view': ['department'],
      'radiology.create': ['department'],
      'radiology.edit': ['department'],
      'radiology.print': ['department'],
      'patients.view': ['department'],
      'emr.view': ['department'],
    },
  },

  // ════════════════════════════════════════════════════════════════
  // FINANCIAL
  // ════════════════════════════════════════════════════════════════
  billing_staff: {
    level: 'tenant',
    scopeDefault: 'branch',
    description: 'Billing operations: invoices, payments, refunds, branch-level',
    grants: {
      'billing.*': ['branch'],
      'insurance.view': ['branch'],
      'patients.view': ['branch'],
      'eta_invoicing.view': ['branch'],
      'eta_invoicing.create': ['branch'],
    },
  },

  accountant: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'Financial management: expenses, ledger, financial reports, tax config',
    grants: {
      'expenses.*': ['tenant'],
      'financial_reports.*': ['tenant'],
      'billing.view': ['tenant'],
      'billing.export': ['tenant'],
      'reports.view': ['tenant'],
      'reports.export': ['tenant'],
    },
  },

  insurance_officer: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'Claims lifecycle: eligibility, pre-auth, claim tracking, denials',
    grants: {
      'insurance.*': ['tenant'],
      'insurance_claims.*': ['tenant'],
      'patients.view': ['tenant'],
      'billing.view': ['tenant'],
      'emr.view': ['tenant'],
      'reports.view': ['tenant'],
    },
  },

  payroll_officer: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'Payroll processing: salary, deductions, allowances, payslips',
    grants: {
      'hr.view': ['tenant'],
      'hr.edit': ['tenant'],
      'hr.export': ['tenant'],
      'financial_reports.view': ['tenant'],
    },
  },

  // ════════════════════════════════════════════════════════════════
  // HR
  // ════════════════════════════════════════════════════════════════
  hr_manager: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'Full HR authority: recruitment, training, performance, delete employees',
    grants: {
      'hr.*': ['tenant'],
      'users.view': ['tenant'],
      'users.manage': ['tenant'],
      'reports.view': ['tenant'],
    },
  },

  hr_staff: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'Daily HR: attendance, leave requests, employee records — no delete, no manage',
    grants: {
      'hr.view': ['tenant'],
      'hr.create': ['tenant'],
      'hr.edit': ['tenant'],
      'users.view': ['tenant'],
    },
  },

  // ════════════════════════════════════════════════════════════════
  // OPERATIONS
  // ════════════════════════════════════════════════════════════════
  inventory_manager: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'Stock management: items, adjustments, expiry, stock counts, delete authority',
    grants: {
      'inventory.*': ['tenant'],
      'reports.view': ['tenant'],
    },
  },

  procurement_officer: {
    level: 'tenant',
    scopeDefault: 'tenant',
    description: 'Purchasing: RFQs, purchase orders, vendor management, goods receipt',
    grants: {
      'expenses.create': ['tenant'],
      'expenses.edit': ['tenant'],
      'expenses.view': ['tenant'],
      'expenses.export': ['tenant'],
      'inventory.view': ['tenant'],
      'inventory.create': ['tenant'],
      'reports.view': ['tenant'],
    },
  },

  storekeeper: {
    level: 'tenant',
    scopeDefault: 'branch',
    description: 'Physical stock: receive, issue, stock transfers, count — branch-scoped',
    grants: {
      'inventory.view': ['branch'],
      'inventory.create': ['branch'],
      'inventory.edit': ['branch'],
    },
  },

  equipment_technician: {
    level: 'tenant',
    scopeDefault: 'branch',
    description: 'Equipment maintenance: preventive/corrective maintenance, calibration, work orders',
    grants: {
      'workflow.*': ['branch'],
      'inventory.view': ['branch'],
      'inventory.edit': ['branch'],
    },
  },

  // ════════════════════════════════════════════════════════════════
  // PORTAL & EXTERNAL
  // ════════════════════════════════════════════════════════════════
  patient: {
    level: 'tenant',
    scopeDefault: 'self',
    description: 'Patient portal: own medical data, appointments, bills, documents',
    grants: {
      'patients.view': ['self'],
      'appointments.view': ['self'],
      'appointments.create': ['self'],
      'emr.view': ['self'],
      'laboratory.view': ['self'],
      'radiology.view': ['self'],
      'pharmacy.view': ['self'],
      'billing.view': ['self'],
      'documents.view': ['self'],
      'documents.download': ['self'],
      'chat.view': ['self'],
      'chat.create': ['self'],
      'notifications.view': ['self'],
      'patient_portal.view': ['self'],
    },
  },

  guardian_parent: {
    level: 'tenant',
    scopeDefault: 'self',
    description: 'Dependent portal: manage child/dependent medical data, book appointments',
    grants: {
      'patients.view': ['self'],
      'appointments.view': ['self'],
      'appointments.create': ['self'],
      'emr.view': ['self'],
      'billing.view': ['self'],
      'documents.view': ['self'],
      'documents.download': ['self'],
      'chat.view': ['self'],
      'chat.create': ['self'],
      'notifications.view': ['self'],
    },
  },

  vendor_supplier: {
    level: 'tenant',
    scopeDefault: 'self',
    description: 'Supplier portal: purchase orders, delivery, invoices — own account only',
    grants: {
      'inventory.view': ['self'],
      'documents.view': ['self'],
      'documents.download': ['self'],
    },
  },

  guest: {
    level: 'tenant',
    scopeDefault: 'self',
    description: 'Temporary access: explicitly assigned resources only',
    grants: {},
  },
};
