import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // WhatsApp Messages
  if (!(await knex.schema.hasTable('whatsapp_messages'))) {
    await knex.schema.createTable('whatsapp_messages', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('patient_id').references('id').inTable('patients').onDelete('SET NULL').nullable();
      table.string('to_number', 30).notNullable();
      table.string('from_number', 30).nullable();
      table.string('direction', 10).defaultTo('outbound'); // inbound | outbound
      table.string('message_type', 20).defaultTo('text'); // text | template | image | document
      table.text('message').nullable();
      table.string('template_name', 100).nullable();
      table.jsonb('template_params').nullable();
      table.string('status', 20).defaultTo('sent'); // sent | delivered | read | failed
      table.string('external_id', 100).nullable();
      table.string('external_message_id', 100).nullable();
      table.text('error_message').nullable();
      table.jsonb('metadata').nullable();
      table.timestamp('sent_at').defaultTo(knex.fn.now());
      table.timestamp('delivered_at').nullable();
      table.timestamp('read_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'to_number']);
      table.index(['tenant_id', 'created_at']);
    });
  }

  // WhatsApp Templates
  if (!(await knex.schema.hasTable('whatsapp_templates'))) {
    await knex.schema.createTable('whatsapp_templates', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').nullable();
      table.string('name', 100).notNullable();
      table.string('category', 50).defaultTo('utility'); // marketing | utility | authentication
      table.string('language', 10).defaultTo('en');
      table.text('body_text').notNullable();
      table.jsonb('variables').defaultTo('[]');
      table.string('status', 20).defaultTo('approved'); // pending | approved | rejected
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'is_active']);
    });
  }

  // Voice Calls
  if (!(await knex.schema.hasTable('voice_calls'))) {
    await knex.schema.createTable('voice_calls', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('patient_id').references('id').inTable('patients').onDelete('SET NULL').nullable();
      table.uuid('appointment_id').references('id').inTable('appointments').onDelete('SET NULL').nullable();
      table.uuid('initiated_by').references('id').inTable('users').onDelete('SET NULL').nullable();
      table.string('call_type', 20).defaultTo('outbound'); // inbound | outbound | conference
      table.string('from_number', 30).notNullable();
      table.string('to_number', 30).notNullable();
      table.string('status', 20).defaultTo('initiated'); // initiated | ringing | answered | completed | failed | busy | no-answer
      table.integer('duration_seconds').defaultTo(0);
      table.integer('ringing_seconds').defaultTo(0);
      table.string('external_call_sid', 100).nullable();
      table.jsonb('recording_urls').nullable();
      table.text('notes').nullable();
      table.text('error_message').nullable();
      table.timestamp('started_at').nullable();
      table.timestamp('answered_at').nullable();
      table.timestamp('completed_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'created_at']);
      table.index(['tenant_id', 'status']);
      table.index(['tenant_id', 'patient_id']);
    });
  }

  // Chat Conversations
  if (!(await knex.schema.hasTable('chat_conversations'))) {
    await knex.schema.createTable('chat_conversations', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.string('title', 200).notNullable();
      table.uuid('patient_id').references('id').inTable('patients').onDelete('SET NULL').nullable();
      table.uuid('appointment_id').references('id').inTable('appointments').onDelete('SET NULL').nullable();
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('last_message_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'is_active']);
    });
  }

  // Chat Participants
  if (!(await knex.schema.hasTable('chat_participants'))) {
    await knex.schema.createTable('chat_participants', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('conversation_id').references('id').inTable('chat_conversations').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.string('role', 20).defaultTo('staff'); // doctor | patient | staff | admin
      table.integer('unread_count').defaultTo(0);
      table.timestamp('last_read_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['conversation_id', 'user_id']);
    });
  }

  // Chat Messages
  if (!(await knex.schema.hasTable('chat_messages'))) {
    await knex.schema.createTable('chat_messages', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('conversation_id').references('id').inTable('chat_conversations').onDelete('CASCADE');
      table.uuid('sender_id').references('id').inTable('users').onDelete('SET NULL').nullable();
      table.string('sender_role', 20).defaultTo('staff');
      table.string('message_type', 20).defaultTo('text'); // text | image | file | system
      table.text('content').notNullable();
      table.jsonb('metadata').nullable();
      table.boolean('is_edited').defaultTo(false);
      table.boolean('is_deleted').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['conversation_id', 'created_at']);
    });
  }

  // Call Recordings metadata
  if (!(await knex.schema.hasTable('call_recordings'))) {
    await knex.schema.createTable('call_recordings', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('call_id').references('id').inTable('voice_calls').onDelete('CASCADE');
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.string('url', 500).notNullable();
      table.integer('duration_seconds').defaultTo(0);
      table.string('format', 10).defaultTo('mp3');
      table.integer('file_size_bytes').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['call_id']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('call_recordings');
  await knex.schema.dropTableIfExists('chat_messages');
  await knex.schema.dropTableIfExists('chat_participants');
  await knex.schema.dropTableIfExists('chat_conversations');
  await knex.schema.dropTableIfExists('voice_calls');
  await knex.schema.dropTableIfExists('whatsapp_templates');
  await knex.schema.dropTableIfExists('whatsapp_messages');
}
