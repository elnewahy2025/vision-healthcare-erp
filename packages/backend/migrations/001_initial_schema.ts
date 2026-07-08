import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Tenants table
  await knex.schema.createTable('tenants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 200).notNullable();
    table.string('slug', 30).notNullable().unique();
    table.string('domain').nullable();
    table.string('locale', 2).notNullable().defaultTo('en');
    table.string('timezone', 50).defaultTo('Asia/Riyadh');
    table.jsonb('settings').defaultTo('{}');
    table.string('status', 20).notNullable().defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Roles table
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('slug', 100).notNullable();
    table.text('description').nullable();
    table.jsonb('permissions').defaultTo('[]');
    table.boolean('is_system').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'slug']);
  });

  // Users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('email', 255).notNullable();
    table.string('phone', 20).nullable();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.uuid('role_id').references('id').inTable('roles').nullable();
    table.jsonb('roles').defaultTo('[]');
    table.jsonb('permissions').defaultTo('[]');
    table.string('locale', 2).defaultTo('en');
    table.string('status', 20).defaultTo('active');
    table.boolean('mfa_enabled').defaultTo(false);
    table.string('mfa_secret').nullable();
    table.uuid('branch_id').nullable();
    table.timestamp('last_login_at').nullable();
    table.timestamp('password_changed_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'email']);
  });

  // Branches table
  await knex.schema.createTable('branches', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('code', 20).notNullable();
    table.jsonb('address').nullable();
    table.string('phone', 20).notNullable();
    table.string('email', 255).nullable();
    table.string('status', 20).defaultTo('active');
    table.string('timezone', 50).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'code']);
  });

  // Patients table
  await knex.schema.createTable('patients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('medical_record_number', 50).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.date('date_of_birth').notNullable();
    table.string('gender', 10).notNullable();
    table.string('nationality', 100).nullable();
    table.string('blood_type', 5).nullable();
    table.string('email', 255).nullable();
    table.string('phone', 20).notNullable();
    table.string('phone2', 20).nullable();
    table.jsonb('address').nullable();
    table.jsonb('emergency_contact').nullable();
    table.jsonb('insurance').nullable();
    table.jsonb('allergies').nullable();
    table.jsonb('medical_history').nullable();
    table.string('marital_status', 20).nullable();
    table.string('occupation', 100).nullable();
    table.string('preferred_language', 2).defaultTo('en');
    table.string('profile_image').nullable();
    table.string('status', 20).defaultTo('active');
    table.jsonb('tags').defaultTo('[]');
    table.uuid('created_by').references('id').inTable('users').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'status']);
    table.index(['tenant_id', 'medical_record_number']);
    table.index(['tenant_id', 'first_name', 'last_name']);
  });

  // Appointments table
  await knex.schema.createTable('appointments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('doctor_id').references('id').inTable('users');
    table.uuid('branch_id').references('id').inTable('branches').nullable();
    table.date('appointment_date').notNullable();
    table.string('start_time', 5).notNullable();
    table.string('end_time', 5).notNullable();
    table.integer('duration').notNullable().defaultTo(15);
    table.string('type', 30).notNullable();
    table.string('status', 30).notNullable().defaultTo('scheduled');
    table.text('reason').nullable();
    table.text('notes').nullable();
    table.boolean('is_walk_in').defaultTo(false);
    table.boolean('is_virtual').defaultTo(false);
    table.string('telemedicine_link').nullable();
    table.boolean('reminder_sent').defaultTo(false);
    table.jsonb('reminders').defaultTo('[]');
    table.timestamp('check_in_time').nullable();
    table.timestamp('check_out_time').nullable();
    table.timestamp('cancelled_at').nullable();
    table.text('cancel_reason').nullable();
    table.uuid('rescheduled_from').nullable();
    table.uuid('created_by').references('id').inTable('users').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'appointment_date']);
    table.index(['tenant_id', 'status']);
    table.index(['tenant_id', 'patient_id']);
    table.index(['tenant_id', 'doctor_id']);
  });

  // EMR Records table
  await knex.schema.createTable('emr_records', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('appointment_id').references('id').inTable('appointments').nullable();
    table.uuid('doctor_id').references('id').inTable('users');
    table.date('encounter_date').notNullable();
    table.string('encounter_type', 30).notNullable();
    table.text('chief_complaint').nullable();
    table.text('subjective').nullable();
    table.text('objective').nullable();
    table.text('assessment').nullable();
    table.text('plan').nullable();
    table.jsonb('diagnosis').defaultTo('[]');
    table.jsonb('procedures').defaultTo('[]');
    table.jsonb('medications').defaultTo('[]');
    table.jsonb('lab_orders').defaultTo('[]');
    table.jsonb('radiology_orders').defaultTo('[]');
    table.jsonb('vitals').nullable();
    table.text('notes').nullable();
    table.string('status', 20).defaultTo('draft');
    table.uuid('created_by').references('id').inTable('users').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'patient_id']);
    table.index(['tenant_id', 'encounter_date']);
  });

  // Invoices table
  await knex.schema.createTable('invoices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('appointment_id').references('id').inTable('appointments').nullable();
    table.string('invoice_number', 50).notNullable().unique();
    table.jsonb('items').notNullable();
    table.decimal('subtotal', 12, 2).notNullable();
    table.decimal('discount', 12, 2).defaultTo(0);
    table.decimal('tax', 12, 2).defaultTo(0);
    table.decimal('total', 12, 2).notNullable();
    table.decimal('paid', 12, 2).defaultTo(0);
    table.decimal('due', 12, 2).notNullable();
    table.string('status', 20).defaultTo('pending');
    table.string('payment_method', 30).nullable();
    table.string('insurance_claim').nullable();
    table.text('notes').nullable();
    table.date('due_date').notNullable();
    table.timestamp('issued_at').defaultTo(knex.fn.now());
    table.timestamp('paid_at').nullable();
    table.uuid('created_by').references('id').inTable('users').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'status']);
    table.index(['tenant_id', 'patient_id']);
    table.index(['tenant_id', 'issued_at']);
  });

  // Payment transactions table
  await knex.schema.createTable('payment_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('invoice_id').references('id').inTable('invoices');
    table.decimal('amount', 12, 2).notNullable();
    table.string('method', 30).notNullable();
    table.string('reference').nullable();
    table.text('notes').nullable();
    table.string('status', 20).defaultTo('completed');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Audit logs table
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('user_id').nullable();
    table.string('action', 100).notNullable();
    table.string('entity', 100).notNullable();
    table.string('entity_id').nullable();
    table.jsonb('changes').nullable();
    table.string('ip', 45).nullable();
    table.string('user_agent').nullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'timestamp']);
    table.index(['tenant_id', 'entity', 'entity_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('payment_transactions');
  await knex.schema.dropTableIfExists('invoices');
  await knex.schema.dropTableIfExists('emr_records');
  await knex.schema.dropTableIfExists('appointments');
  await knex.schema.dropTableIfExists('patients');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('branches');
  await knex.schema.dropTableIfExists('tenants');
}
