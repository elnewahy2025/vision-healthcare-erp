import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Branches table

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

  // Webhook configurations
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('webhooks');
  await knex.schema.dropTableIfExists('report_schedules');
  await knex.schema.dropTableIfExists('reports');
  
  const hasApptBranch = await knex.schema.hasColumn('appointments', 'branch_id');
  if (hasApptBranch) {
    await knex.schema.alterTable('appointments', (table) => { table.dropColumn('branch_id'); });
  }
  const hasPatientBranch = await knex.schema.hasColumn('patients', 'branch_id');
  if (hasPatientBranch) {
    await knex.schema.alterTable('patients', (table) => { table.dropColumn('branch_id'); });
  }
  const hasBranchCol = await knex.schema.hasColumn('users', 'branch_id');
  if (hasBranchCol) {
    await knex.schema.alterTable('users', (table) => { table.dropColumn('branch_id'); });
  }
  await knex.schema.dropTableIfExists('branches');
}
