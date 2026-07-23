import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add account lockout columns to users
  const hasFailedAttempts = await knex.schema.hasColumn('users', 'failed_login_attempts');
  if (!hasFailedAttempts) {
    await knex.schema.alterTable('users', (table) => {
      table.integer('failed_login_attempts').defaultTo(0);
      table.timestamp('locked_until').nullable();
      table.string('email_verification_token').nullable();
      table.boolean('email_verified').defaultTo(false);
      table.timestamp('email_verified_at').nullable();
    });
  }

  // Create login_attempts table for IP-based tracking
  if (!(await knex.schema.hasTable('login_attempts'))) {
    await knex.schema.createTable('login_attempts', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('ip_address', 45).notNullable();
      table.string('email').nullable();
      table.string('tenant_id').nullable();
      table.boolean('success').notNullable();
      table.string('user_agent').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['ip_address', 'created_at']);
      table.index(['email', 'created_at']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('login_attempts');
  if (await knex.schema.hasColumn('users', 'failed_login_attempts')) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('failed_login_attempts');
      table.dropColumn('locked_until');
      table.dropColumn('email_verification_token');
      table.dropColumn('email_verified');
      table.dropColumn('email_verified_at');
    });
  }
}
