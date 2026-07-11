import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Bulk Import
  if (!(await knex.schema.hasTable('import_jobs'))) {
    await knex.schema.createTable('import_jobs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.string('module', 100).notNullable();
      table.string('file_name', 255).notNullable();
      table.string('format', 20).defaultTo('csv');
      table.string('status', 30).defaultTo('pending'); // pending, validating, processing, completed, failed
      table.integer('total_rows').defaultTo(0);
      table.integer('successful_rows').defaultTo(0);
      table.integer('failed_rows').defaultTo(0);
      table.jsonb('errors').defaultTo('[]');
      table.jsonb('column_mapping').defaultTo('{}');
      table.text('raw_data').nullable();
      table.uuid('created_by').nullable();
      table.timestamp('started_at').nullable();
      table.timestamp('completed_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'status']);
    });
  }

  // Notification Preferences
  if (!(await knex.schema.hasTable('notification_preferences'))) {
    await knex.schema.createTable('notification_preferences', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('channel', 30).defaultTo('in_app'); // in_app, email, sms, whatsapp
      table.jsonb('events').defaultTo('["*"]'); // appointment_reminder, lab_result, billing, etc
      table.boolean('is_enabled').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'user_id', 'channel']);
    });
  }

  // User Settings / Shortcuts
  if (!(await knex.schema.hasTable('user_settings'))) {
    await knex.schema.createTable('user_settings', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').unique();
      table.string('theme', 20).defaultTo('light'); // light, dark, system
      table.jsonb('shortcuts').defaultTo('[]');
      table.jsonb('dashboard_config').defaultTo('{}');
      table.integer('items_per_page').defaultTo(25);
      table.string('date_format', 20).defaultTo('YYYY-MM-DD');
      table.string('time_format', 20).defaultTo('HH:mm');
      table.string('timezone', 50).nullable();
      table.boolean('quick_search_enabled').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const tables = ['user_settings', 'notification_preferences', 'import_jobs'];
  for (const t of tables) await knex.schema.dropTableIfExists(t);
}
