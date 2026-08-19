import crypto from "crypto";
import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import {
  SEED_ROLES,
  expandRoleGrants,
  PERMISSION_CATALOG,
  type PermissionScope,
} from '@healthcare/shared/authz';

/**
 * Demo seed — creates a fully-functional demo tenant with all 39 role
 * templates, demo users for key roles, patients, appointments, and invoices.
 *
 * Uses the current permission catalog format (patients.view, not patient:read).
 * Creates memberships for every demo user so the membership-based auth works.
 *
 * Run: npx knex seed:run --knexfile packages/backend/knexfile.ts
 */

// ── Helpers ──

async function upsertRole(
  trx: Knex.Transaction,
  tenantId: string,
  slug: string,
): Promise<string> {
  const template = SEED_ROLES[slug];
  if (!template) throw new Error(`Unknown role: ${slug}`);

  let role = await trx('roles').where({ tenant_id: tenantId, slug }).first();
  if (!role) {
    [role] = await trx('roles')
      .insert({
        tenant_id: tenantId,
        name: slug.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        slug,
        description: template.description || null,
        permissions: '[]',
        is_system: true,
        level: template.level,
        scope_default: template.scopeDefault,
      })
      .returning('*');
  }

  // Ensure role_permissions are seeded
  const grants = expandRoleGrants(template);
  const existing = await trx('role_permissions')
    .where({ role_id: role.id })
    .select('permission', 'scope');
  const existingKeys = new Set(
    existing.map((r: { permission: string; scope: string }) => `${r.permission}:${r.scope}`),
  );
  for (const grant of grants) {
    const key = `${grant.permission}:${grant.scope}`;
    if (!existingKeys.has(key)) {
      await trx('role_permissions').insert({
        role_id: role.id,
        tenant_id: tenantId,
        permission: grant.permission,
        scope: grant.scope,
      });
    }
  }

  return String(role.id);
}

async function createUser(
  trx: Knex.Transaction,
  params: {
    tenantId: string;
    branchId: string | null;
    departmentId: string | null;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleSlug: string;
    locale?: string;
    employeeType?: string;
    position?: string;
  },
): Promise<{ userId: string; membershipId: string }> {
  const passwordHash = await bcrypt.hash(params.password, 12);
  const roleId = await upsertRole(trx, params.tenantId, params.roleSlug);

  const [user] = await trx('users')
    .insert({
      tenant_id: params.tenantId,
      branch_id: params.branchId,
      department_id: params.departmentId,
      email: params.email,
      password_hash: passwordHash,
      first_name: params.firstName,
      last_name: params.lastName,
      role_id: roleId,
      roles: JSON.stringify([params.roleSlug]),
      permissions: JSON.stringify([]),
      locale: params.locale || 'en',
      status: 'active',
      mfa_enabled: false,
      password_changed_at: new Date(),
      employee_type: params.employeeType || 'staff',
      position: params.position || null,
    })
    .returning('*');

  // Create user_roles entry
  const existingUserRole = await trx('user_roles')
    .where({ user_id: user.id, role_id: roleId })
    .first();
  if (!existingUserRole) {
    await trx('user_roles').insert({
      user_id: user.id,
      role_id: roleId,
      tenant_id: params.tenantId,
      assigned_by: user.id,
    });
  }

  // Create membership
  const [membership] = await trx('memberships')
    .insert({
      user_id: user.id,
      tenant_id: params.tenantId,
      branch_id: params.branchId,
      department_id: params.departmentId,
      status: 'active',
      authz_version: 1,
    })
    .returning('*');

  // Set as active membership
  await trx('users').where({ id: user.id }).update({
    active_membership_id: membership.id,
  });

  // Create user_branches entry if branch assigned
  if (params.branchId) {
    const existingBranch = await trx('user_branches')
      .where({ user_id: user.id, branch_id: params.branchId })
      .first();
    if (!existingBranch) {
      await trx('user_branches').insert({
        user_id: user.id,
        branch_id: params.branchId,
        tenant_id: params.tenantId,
        is_primary: true,
      });
    }
  }

  return { userId: String(user.id), membershipId: String(membership.id) };
}

// ════════════════════════════════════════════════════════════════════
// SEED
// ════════════════════════════════════════════════════════════════════

export async function seed(knex: Knex): Promise<void> {
  // ── Clean up (order matters for FK constraints) ──
  const tablesToClean = [
    'audit_logs', 'booking_requests', 'booking_slots',
    'payment_transactions', 'invoices', 'emr_records',
    'appointments', 'patients', 'emergency_access',
    'user_branches', 'user_roles', 'user_permissions',
    'role_permissions', 'memberships',
    'users', 'roles', 'departments', 'branches', 'tenants',
  ];
  for (const table of tablesToClean) {
    try { await knex(table).del(); } catch { /* table may not exist */ }
  }

  await knex.transaction(async (trx) => {
    // ════════════════════════════════════════════════════════════════
    // 1. TENANT
    // ════════════════════════════════════════════════════════════════
    const [tenant] = await trx('tenants').insert({
      name: 'Vision Healthcare Demo',
      slug: 'demo',
      locale: 'en',
      timezone: 'Asia/Riyadh',
      settings: JSON.stringify({
        dateFormat: 'DD/MM/YYYY',
        currency: 'SAR',
        timezone: 'Asia/Riyadh',
        theme: { primaryColor: '#0ea5e9', brandName: 'Vision Healthcare' },
        language: 'en',
        direction: 'ltr',
        features: { telemedicine: true, lab: true, radiology: true },
        clinicName: 'Vision Healthcare Eye Hospital',
        branch: 'Main Branch - Riyadh',
        landPhone: '+966-11-456-7890',
        whatsappPhone: '+966-50-123-4567',
        address: '123 King Fahd Road, Al Olaya District',
        city: 'Riyadh',
        country: 'Saudi Arabia',
        googleMapsLocation: 'https://maps.google.com/?q=24.7136,46.6753',
        email: 'info@visionhealthcare.com',
        website: 'https://visionhealthcare.com',
        workingHours: 'Sun-Thu: 9AM-5PM',
        licenseNumber: 'MOH-2024-12345',
        taxNumber: '300012345600003',
      }),
      status: 'active',
    }).returning('*');

    // ════════════════════════════════════════════════════════════════
    // 2. BRANCHES
    // ════════════════════════════════════════════════════════════════
    const [mainBranch] = await trx('branches').insert({
      tenant_id: tenant.id,
      name: 'Main Branch - Riyadh',
      code: 'RYD-001',
      address: '123 King Fahd Road, Al Olaya',
      city: 'Riyadh',
      phone: '+966-11-456-7890',
      is_active: true,
    }).returning('*');

    const [jeddahBranch] = await trx('branches').insert({
      tenant_id: tenant.id,
      name: 'Jeddah Branch',
      code: 'JED-001',
      address: '456 Tahlia Street, Al Hamra',
      city: 'Jeddah',
      phone: '+966-12-654-3210',
      is_active: true,
    }).returning('*');

    // ════════════════════════════════════════════════════════════════
    // 3. DEPARTMENTS
    // ════════════════════════════════════════════════════════════════
    const departmentData = [
      { name: 'Ophthalmology', code: 'OPH' },
      { name: 'Cardiology', code: 'CAR' },
      { name: 'Dermatology', code: 'DER' },
      { name: 'Pediatrics', code: 'PED' },
      { name: 'Internal Medicine', code: 'INT' },
      { name: 'Radiology', code: 'RAD' },
      { name: 'Laboratory', code: 'LAB' },
      { name: 'Pharmacy', code: 'PHR' },
      { name: 'Nursing', code: 'NRS' },
      { name: 'Billing', code: 'BIL' },
      { name: 'Administration', code: 'ADM' },
      { name: 'HR', code: 'HR' },
    ];
    const departments: Record<string, string> = {};
    for (const dept of departmentData) {
      const [d] = await trx('departments').insert({
        tenant_id: tenant.id,
        name: dept.name,
        code: dept.code,
        is_active: true,
      }).returning('*');
      departments[dept.code] = String(d.id);
    }

    // ════════════════════════════════════════════════════════════════
    // 4. ALL 39 ROLE TEMPLATES (seeded into DB with role_permissions)
    // ════════════════════════════════════════════════════════════════
    const roleIds: Record<string, string> = {};
    for (const slug of Object.keys(SEED_ROLES)) {
      roleIds[slug] = await upsertRole(trx, tenant.id, slug);
    }

    // ════════════════════════════════════════════════════════════════
    // 5. DEMO USERS (one per key role)
    // ════════════════════════════════════════════════════════════════
    const users: Record<string, { userId: string; membershipId: string }> = {};

    users.admin = await createUser(trx, {
      tenantId: tenant.id, branchId: mainBranch.id, departmentId: departments.ADM,
      email: 'admin@demo.com', password: 'Admin@123',
      firstName: 'Admin', lastName: 'User', roleSlug: 'super_admin',
      employeeType: 'admin', position: 'System Administrator',
    });

    users.doctor = await createUser(trx, {
      tenantId: tenant.id, branchId: mainBranch.id, departmentId: departments.OPH,
      email: 'doctor@demo.com', password: 'Doctor@123',
      firstName: 'Ahmed', lastName: 'Al-Saud', roleSlug: 'doctor',
      employeeType: 'physician', position: 'Senior Ophthalmologist',
    });

    users.nurse = await createUser(trx, {
      tenantId: tenant.id, branchId: mainBranch.id, departmentId: departments.NRS,
      email: 'nurse@demo.com', password: 'Nurse@123',
      firstName: 'Fatima', lastName: 'Al-Zahrani', roleSlug: 'nurse',
      employeeType: 'nurse', position: 'Head Nurse',
    });

    users.receptionist = await createUser(trx, {
      tenantId: tenant.id, branchId: mainBranch.id, departmentId: null,
      email: 'reception@demo.com', password: 'Recept@123',
      firstName: 'Sara', lastName: 'Al-Qahtani', roleSlug: 'receptionist',
      employeeType: 'staff', position: 'Front Desk Receptionist',
    });

    users.pharmacist = await createUser(trx, {
      tenantId: tenant.id, branchId: mainBranch.id, departmentId: departments.PHR,
      email: 'pharmacist@demo.com', password: 'Pharma@123',
      firstName: 'Khalid', lastName: 'Al-Ghamdi', roleSlug: 'pharmacist',
      employeeType: 'pharmacist', position: 'Chief Pharmacist',
    });

    users.labTech = await createUser(trx, {
      tenantId: tenant.id, branchId: mainBranch.id, departmentId: departments.LAB,
      email: 'labtech@demo.com', password: 'LabTech@123',
      firstName: 'Nora', lastName: 'Al-Shehri', roleSlug: 'lab_tech',
      employeeType: 'lab_tech', position: 'Lab Technician',
    });

    users.billingStaff = await createUser(trx, {
      tenantId: tenant.id, branchId: mainBranch.id, departmentId: departments.BIL,
      email: 'billing@demo.com', password: 'Billing@123',
      firstName: 'Omar', lastName: 'Al-Harbi', roleSlug: 'billing_staff',
      employeeType: 'staff', position: 'Billing Officer',
    });

    users.hrManager = await createUser(trx, {
      tenantId: tenant.id, branchId: mainBranch.id, departmentId: departments.HR,
      email: 'hr@demo.com', password: 'HR@123',
      firstName: 'Maha', lastName: 'Al-Mutairi', roleSlug: 'hr_manager',
      employeeType: 'staff', position: 'HR Manager',
    });

    users.inventoryManager = await createUser(trx, {
      tenantId: tenant.id, branchId: mainBranch.id, departmentId: null,
      email: 'inventory@demo.com', password: 'Inventory@123',
      firstName: 'Faisal', lastName: 'Al-Qahtani', roleSlug: 'inventory_manager',
      employeeType: 'staff', position: 'Inventory Manager',
    });

    users.branchManager = await createUser(trx, {
      tenantId: tenant.id, branchId: mainBranch.id, departmentId: null,
      email: 'branchmgr@demo.com', password: 'Branch@123',
      firstName: 'Sultan', lastName: 'Al-Dosari', roleSlug: 'branch_manager',
      employeeType: 'admin', position: 'Branch Manager',
    });

    users.insuranceOfficer = await createUser(trx, {
      tenantId: tenant.id, branchId: mainBranch.id, departmentId: null,
      email: 'insurance@demo.com', password: 'Insurance@123',
      firstName: 'Aisha', lastName: 'Al-Otaibi', roleSlug: 'insurance_officer',
      employeeType: 'staff', position: 'Insurance Officer',
    });

    users.radiologist = await createUser(trx, {
      tenantId: tenant.id, branchId: mainBranch.id, departmentId: departments.RAD,
      email: 'radiologist@demo.com', password: 'Radio@123',
      firstName: 'Yusuf', lastName: 'Al-Shammari', roleSlug: 'radiologist',
      employeeType: 'physician', position: 'Consultant Radiologist',
    });

    // ════════════════════════════════════════════════════════════════
    // 6. PATIENTS
    // ════════════════════════════════════════════════════════════════
    const patientsData = [
      { firstName: 'Mohammed', lastName: 'Al-Rashid', dob: '1980-05-14', gender: 'male', phone: '+966501234567', bloodType: 'O+' },
      { firstName: 'Layla', lastName: 'Al-Otaibi', dob: '1985-06-15', gender: 'female', phone: '+966501234568', bloodType: 'A+' },
      { firstName: 'Khalid', lastName: 'Al-Ghamdi', dob: '1978-11-08', gender: 'male', phone: '+966501234569', bloodType: 'B+' },
      { firstName: 'Nora', lastName: 'Al-Shehri', dob: '2000-07-30', gender: 'female', phone: '+966501234570', bloodType: 'AB+' },
      { firstName: 'Faisal', lastName: 'Al-Qahtani', dob: '1965-01-12', gender: 'male', phone: '+966501234571', bloodType: 'A-' },
      { firstName: 'Aisha', lastName: 'Al-Harbi', dob: '1995-09-18', gender: 'female', phone: '+966501234572', bloodType: 'O-' },
      { firstName: 'Sultan', lastName: 'Al-Dosari', dob: '1988-04-25', gender: 'male', phone: '+966501234573', bloodType: 'B-' },
      { firstName: 'Maha', lastName: 'Al-Mutairi', dob: '1992-12-03', gender: 'female', phone: '+966501234574', bloodType: 'AB-' },
    ];

    const patientRecords: Record<string, unknown>[] = [];
    for (const p of patientsData) {
      const year = new Date().getFullYear();
      const random = crypto.randomBytes(3).toString('hex').toUpperCase();
      const mrn = `MRN-${year}-${random}`;
      const [patient] = await trx('patients').insert({
        tenant_id: tenant.id,
        branch_id: mainBranch.id,
        department_id: departments.OPH,
        medical_record_number: mrn,
        first_name: p.firstName,
        last_name: p.lastName,
        date_of_birth: p.dob,
        gender: p.gender,
        phone: p.phone,
        blood_type: p.bloodType,
        status: 'active',
        preferred_language: 'ar',
        created_by: users.doctor.userId,
      }).returning('*');
      patientRecords.push(patient);
    }

    // ════════════════════════════════════════════════════════════════
    // 7. APPOINTMENTS
    // ════════════════════════════════════════════════════════════════
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const appointmentTypes = ['consultation', 'followup', 'checkup', 'procedure'];

    for (let i = 0; i < 5; i++) {
      const patient = patientRecords[i];
      const hour = 9 + i;
      await trx('appointments').insert({
        tenant_id: tenant.id,
        branch_id: mainBranch.id,
        patient_id: patient.id,
        doctor_id: users.doctor.userId,
        appointment_date: i < 3 ? today : tomorrow,
        start_time: `${String(hour).padStart(2, '0')}:00`,
        end_time: `${String(hour + 1).padStart(2, '0')}:00`,
        duration: 60,
        type: appointmentTypes[i % appointmentTypes.length],
        status: i < 2 ? 'completed' : 'scheduled',
        reason: `${appointmentTypes[i % appointmentTypes.length]} check`,
        is_walk_in: false,
        is_virtual: false,
      });
    }

    // ════════════════════════════════════════════════════════════════
    // 8. INVOICES
    // ════════════════════════════════════════════════════════════════
    for (let i = 0; i < 3; i++) {
      const patient = patientRecords[i];
      const items = [
        { description: 'Consultation Fee', code: 'CONS-001', quantity: 1, unitPrice: 300, total: 300, type: 'consultation' },
        { description: 'Blood Test - CBC', code: 'LAB-001', quantity: 1, unitPrice: 150, total: 150, type: 'laboratory' },
      ];
      const subtotal = items.reduce((s, item) => s + item.total, 0);
      const tax = subtotal * 0.15;
      const total = subtotal + tax;

      await trx('invoices').insert({
        tenant_id: tenant.id,
        branch_id: mainBranch.id,
        patient_id: patient.id,
        invoice_number: `INV-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
        items: JSON.stringify(items),
        subtotal,
        discount: 0,
        tax,
        total,
        paid: i === 0 ? total : 0,
        due: i === 0 ? 0 : total,
        status: i === 0 ? 'paid' : 'pending',
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        issued_at: new Date(),
      });
    }

    // ════════════════════════════════════════════════════════════════
    // 9. INSURANCE COMPANIES + CLAIMS
    // ════════════════════════════════════════════════════════════════
    const insuranceCompanies: Record<string, unknown>[] = [];
    const companyNames = ['Bupa Arabia', 'Tawuniya', 'Medgulf', 'Al Rajhi Takaful', 'AXA'];
    for (const name of companyNames) {
      const [company] = await trx('insurance_companies').insert({
        tenant_id: tenant.id,
        name,
        code: name.substring(0, 3).toUpperCase(),
        contract_type: 'network',
        discount_rate: 10,
      }).returning('*');
      insuranceCompanies.push(company);
    }

    for (let i = 0; i < Math.min(3, patientRecords.length); i++) {
      const patient = patientRecords[i];
      const company = insuranceCompanies[i % insuranceCompanies.length];
      await trx('insurance_claims').insert({
        tenant_id: tenant.id,
        patient_id: patient.id,
        insurance_id: company.id,
        claim_number: `CLM-${new Date().getFullYear()}-${String(i + 1).padStart(5, '0')}`,
        status: i === 0 ? 'approved' : 'draft',
        claimed_amount: 500 + i * 200,
        approved_amount: i === 0 ? 450 : 0,
        paid_amount: i === 0 ? 450 : 0,
        created_by: users.admin.userId,
      });
    }

    // ════════════════════════════════════════════════════════════════
    // SUMMARY
    // ════════════════════════════════════════════════════════════════
    const roleCount = Object.keys(roleIds).length;
    const rolePerms = await trx('role_permissions').where({ tenant_id: tenant.id }).count('id as cnt').first();
    const membershipCount = await trx('memberships').where({ tenant_id: tenant.id }).count('id as cnt').first();

    console.log('═══ Demo data seeded ═══');
    console.log(`  Tenant: demo (Vision Healthcare Demo)`);
    console.log(`  Roles: ${roleCount} templates seeded`);
    console.log(`  Role permissions: ${rolePerms?.cnt || 0} total grants`);
    console.log(`  Memberships: ${membershipCount?.cnt || 0}`);
    console.log(`  Departments: ${departmentData.length}`);
    console.log(`  Patients: ${patientRecords.length}`);
    console.log('');
    console.log('  Demo accounts:');
    console.log('    admin@demo.com       / Admin@123       (super_admin)');
    console.log('    doctor@demo.com      / Doctor@123      (doctor)');
    console.log('    nurse@demo.com       / Nurse@123       (nurse)');
    console.log('    reception@demo.com   / Recept@123      (receptionist)');
    console.log('    pharmacist@demo.com  / Pharma@123      (pharmacist)');
    console.log('    labtech@demo.com     / LabTech@123     (lab_tech)');
    console.log('    billing@demo.com     / Billing@123     (billing_staff)');
    console.log('    hr@demo.com          / HR@123          (hr_manager)');
    console.log('    inventory@demo.com   / Inventory@123   (inventory_manager)');
    console.log('    branchmgr@demo.com   / Branch@123      (branch_manager)');
    console.log('    insurance@demo.com   / Insurance@123   (insurance_officer)');
    console.log('    radiologist@demo.com / Radio@123       (radiologist)');
  });
}
