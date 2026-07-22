import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('refresh_tokens'))) {
    await knex.schema.createTable('refresh_tokens', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('token_hash').notNullable().unique();
      table.string('family').notNullable().index();
      table.timestamp('expires_at').notNullable();
      table.boolean('is_revoked').defaultTo(false);
      table.string('replaced_by_token_hash').nullable();
      table.string('ip_address').nullable();
      table.string('user_agent').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });

    await knex.schema.raw(
      'CREATE INDEX idx_refresh_tokens_user_active ON refresh_tokens(user_id, is_revoked, expires_at)'
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('refresh_tokens');
}
