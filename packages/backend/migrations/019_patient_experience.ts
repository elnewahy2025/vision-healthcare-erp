import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Kiosk Check-ins
  await knex.schema.createTable('kiosk_checkins', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients').onDelete('SET NULL').nullable();
    table.uuid('appointment_id').references('id').inTable('appointments').onDelete('SET NULL').nullable();
    table.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL').nullable();
    table.string('status', 20).defaultTo('checked_in'); // checked_in | waiting | in_progress | completed | no_show
    table.integer('queue_number').nullable();
    table.string('kiosk_id', 50).nullable();
    table.string('national_id_input', 20).nullable();
    table.timestamp('checked_in_at').defaultTo(knex.fn.now());
    table.timestamp('called_at').nullable();
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'status']);
    table.index(['tenant_id', 'checked_in_at']);
  });

  // Post-Visit Surveys
  await knex.schema.createTable('surveys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('type', 30).defaultTo('satisfaction'); // satisfaction | feedback | complaint | follow_up
    table.text('description').nullable();
    table.jsonb('questions').notNullable(); // [{id, text, type: 'rating'|'text'|'choice', options?, required}]
    table.boolean('is_active').defaultTo(true);
    table.boolean('auto_send').defaultTo(false);
    table.integer('estimated_minutes').defaultTo(2);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'is_active']);
  });

  // Survey Responses
  await knex.schema.createTable('survey_responses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('survey_id').references('id').inTable('surveys').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients').onDelete('SET NULL').nullable();
    table.uuid('appointment_id').references('id').inTable('appointments').onDelete('SET NULL').nullable();
    table.uuid('checkin_id').references('id').inTable('kiosk_checkins').onDelete('SET NULL').nullable();
    table.jsonb('responses').notNullable(); // {questionId: answer}
    table.decimal('overall_score', 3, 1).nullable(); // 1.0 - 5.0
    table.text('patient_comment').nullable();
    table.string('status', 20).defaultTo('submitted'); // submitted | reviewed | closed
    table.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL').nullable();
    table.text('staff_notes').nullable();
    table.timestamp('submitted_at').defaultTo(knex.fn.now());
    table.timestamp('reviewed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'survey_id']);
    table.index(['tenant_id', 'created_at']);
  });

  // Queue Display Settings
  await knex.schema.createTable('queue_display_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL').nullable();
    table.string('display_name', 100).defaultTo('Main Display');
    table.string('layout', 20).defaultTo('list'); // list | grid | minimal
    table.string('theme', 20).defaultTo('light'); // light | dark
    table.integer('font_size').defaultTo(16);
    table.boolean('show_wait_time').defaultTo(true);
    table.boolean('show_queue_count').defaultTo(true);
    table.boolean('show_announcements').defaultTo(true);
    table.text('welcome_message').nullable();
    table.jsonb('announcements').nullable();
    table.integer('refresh_seconds').defaultTo(10);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'branch_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('queue_display_settings');
  await knex.schema.dropTableIfExists('survey_responses');
  await knex.schema.dropTableIfExists('surveys');
  await knex.schema.dropTableIfExists('kiosk_checkins');
}
