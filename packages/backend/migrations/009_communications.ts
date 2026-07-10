import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Print Templates
  await knex.schema.createTable('print_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('code', 100).notNullable();
    table.string('category', 50).defaultTo('clinical'); // clinical, billing, administrative
    table.string('document_type', 50).notNullable(); // invoice, prescription, lab_report, patient_summary
    table.text('content_html').notNullable();
    table.jsonb('variables').defaultTo('[]');
    table.jsonb('styles').defaultTo('{}');
    table.string('paper_size', 20).defaultTo('A4');
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'code']);
  });

  // User Sessions
  await knex.schema.createTable('user_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash', 256).notNullable();
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 500).nullable();
    table.string('device', 100).nullable();
    table.string('location', 200).nullable();
    table.timestamp('last_activity_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'user_id', 'is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_sessions');
  await knex.schema.dropTableIfExists('print_templates');
}
