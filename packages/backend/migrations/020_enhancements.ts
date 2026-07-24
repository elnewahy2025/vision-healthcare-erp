import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dashboard_widgets');
}
