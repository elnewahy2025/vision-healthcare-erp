import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Branches table
  if (!await knex.schema.hasTable('branches')) {
    await knex.schema.createTable('branches', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('tenant_id').notNullable();
      table.string('name').notNullable();
      table.string('name_ar');
      table.string('code').notNullable();
      table.text('address');
      table.string('city');
      table.string('governorate');
      table.string('phone');
      table.string('email');
      table.string('manager_name');
      table.string('type').defaultTo('branch');
      table.boolean('is_active').defaultTo(true);
      table.decimal('latitude', 10, 7);
      table.decimal('longitude', 10, 7);
      table.jsonb('working_hours');
      table.integer('capacity');
      table.uuid('created_by');
      table.timestamps(true, true);
      table.index(['tenant_id', 'is_active']);
      table.index(['tenant_id', 'code'], 'unique_tenant_branch_code');
    });
  }

  // Add branch_id to users table
  const hasBranchCol = await knex.schema.hasColumn('users', 'branch_id');
  if (!hasBranchCol) {
    await knex.schema.alterTable('users', (table) => {
      table.uuid('branch_id');
    });
  }

  // Add branch_id to patients table
  const hasPatientBranch = await knex.schema.hasColumn('patients', 'branch_id');
  if (!hasPatientBranch) {
    await knex.schema.alterTable('patients', (table) => {
      table.uuid('branch_id');
    });
  }

  // Add branch_id to appointments table
  const hasApptBranch = await knex.schema.hasColumn('appointments', 'branch_id');
  if (!hasApptBranch) {
    await knex.schema.alterTable('appointments', (table) => {
      table.uuid('branch_id');
    });
  }

  // Reports table
  if (!await knex.schema.hasTable('reports')) {
    await knex.schema.createTable('reports', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('tenant_id').notNullable();
      table.string('name').notNullable();
      table.string('type').notNullable();
      table.jsonb('params');
      table.string('format').defaultTo('PDF');
      table.string('status').defaultTo('pending');
      table.string('file_url');
      table.uuid('generated_by');
      table.timestamps(true, true);
      table.index(['tenant_id', 'type']);
    });
  }

  // Report schedules
  if (!await knex.schema.hasTable('report_schedules')) {
    await knex.schema.createTable('report_schedules', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('tenant_id').notNullable();
      table.string('report_type').notNullable();
      table.string('frequency').notNullable();
      table.string('day');
      table.string('time');
      table.string('email');
      table.string('format').defaultTo('PDF');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      table.index(['tenant_id', 'is_active']);
    });
  }

  // Webhook configurations
  if (!await knex.schema.hasTable('webhooks')) {
    await knex.schema.createTable('webhooks', (table) => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('tenant_id').notNullable();
      table.text('url').notNullable();
      table.string('events');
      table.string('secret');
      table.boolean('is_active').defaultTo(true);
      table.integer('retry_count').defaultTo(3);
      table.timestamps(true, true);
      table.index(['tenant_id', 'is_active']);
    });
  }
}
