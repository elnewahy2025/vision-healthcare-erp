import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Rename 'token' column to 'token_hash' on password_resets
  // to match what the auth module actually uses
  const hasTokenCol = await knex.schema.hasColumn('password_resets', 'token');
  const hasTokenHashCol = await knex.schema.hasColumn('password_resets', 'token_hash');

  if (hasTokenCol && !hasTokenHashCol) {
    await knex.schema.alterTable('password_resets', (table) => {
      table.renameColumn('token', 'token_hash');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTokenCol = await knex.schema.hasColumn('password_resets', 'token');
  const hasTokenHashCol = await knex.schema.hasColumn('password_resets', 'token_hash');

  if (hasTokenHashCol && !hasTokenCol) {
    await knex.schema.alterTable('password_resets', (table) => {
      table.renameColumn('token_hash', 'token');
    });
  }
}
