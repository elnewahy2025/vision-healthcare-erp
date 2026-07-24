import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('patient_medications'))) {
    await knex.schema.createTable('patient_medications', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('patient_id').references('id').inTable('patients').onDelete('CASCADE');
      table.string('medication_name', 200).notNullable();
      table.string('dosage', 100).notNullable();
      table.string('frequency', 100).notNullable();
      table.string('route', 50).nullable();
      table.date('start_date').nullable();
      table.date('end_date').nullable();
      table.boolean('is_active').defaultTo(true);
      table.text('notes').nullable();
      table.uuid('prescribed_by').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'patient_id']);
      table.index(['patient_id', 'is_active']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('patient_medications');
}
