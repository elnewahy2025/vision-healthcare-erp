import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Dashboard Widgets
  if (!(await knex.schema.hasTable('dashboard_widgets'))) {
    await knex.schema.createTable('dashboard_widgets', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.jsonb('layout').notNullable(); // [{id, order, visible, size}]
      table.jsonb('preferences').defaultTo('{}'); // {theme, compact, etc}
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'user_id']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dashboard_widgets');
}
