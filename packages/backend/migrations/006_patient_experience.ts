import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Online Booking
  await knex.schema.createTable('booking_slots', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('doctor_id').references('id').inTable('users');
    table.uuid('branch_id').references('id').inTable('branches').nullable();
    table.date('date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.boolean('is_available').defaultTo(true);
    table.string('slot_type', 30).defaultTo('regular'); // regular, emergency, follow_up
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'doctor_id', 'date', 'start_time']);
  });

  await knex.schema.createTable('booking_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('slot_id').references('id').inTable('booking_slots');
    table.uuid('patient_id').references('id').inTable('patients').nullable();
    table.string('patient_name', 200).notNullable();
    table.string('patient_phone', 20).notNullable();
    table.string('patient_email', 255).nullable();
    table.text('reason').nullable();
    table.string('status', 30).defaultTo('pending'); // pending, confirmed, cancelled, completed
    table.string('source', 30).defaultTo('portal'); // portal, widget, reception
    table.text('notes').nullable();
    table.uuid('confirmed_by').nullable();
    table.timestamp('confirmed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'status']);
  });

  // Patient Portal Messaging
  await knex.schema.createTable('patient_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('sender_id').references('id').inTable('users').nullable();
    table.string('direction', 10).defaultTo('outbound'); // inbound, outbound
    table.string('subject', 200).notNullable();
    table.text('body').notNullable();
    table.boolean('is_read').defaultTo(false);
    table.timestamp('read_at').nullable();
    table.uuid('attachment_id').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'patient_id', 'created_at']);
  });

  // Appointment Reminders
  await knex.schema.createTable('appointment_reminders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('appointment_id').references('id').inTable('appointments').onDelete('CASCADE');
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('channel', 20).defaultTo('sms'); // sms, email, push, whatsapp
    table.string('status', 30).defaultTo('pending'); // pending, sent, failed
    table.timestamp('scheduled_at').notNullable();
    table.timestamp('sent_at').nullable();
    table.text('error').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'status', 'scheduled_at']);
  });

  // Shared Patient Documents (portal)
  await knex.schema.createTable('patient_shared_documents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('document_id').references('id').inTable('documents').nullable();
    table.string('title', 200).notNullable();
    table.string('file_name', 255).notNullable();
    table.string('file_type', 100).nullable();
    table.string('storage_path', 500).notNullable();
    table.string('category', 50).defaultTo('lab_result'); // lab_result, radiology_report, prescription, invoice, consent
    table.text('notes').nullable();
    table.timestamp('shared_at').defaultTo(knex.fn.now());
    table.boolean('is_acknowledged').defaultTo(false);
    table.timestamp('acknowledged_at').nullable();
    table.index(['tenant_id', 'patient_id']);
  });

  // Telemedicine Waiting Room
  await knex.schema.createTable('telemedicine_waiting_room', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('session_id').references('id').inTable('telemedicine_sessions').onDelete('CASCADE');
    table.uuid('participant_id').notNullable();
    table.string('participant_type', 20).defaultTo('patient'); // patient, doctor, nurse
    table.string('status', 30).defaultTo('waiting'); // waiting, admitted, completed
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('admitted_at').nullable();
    table.timestamp('left_at').nullable();
  });

  await knex.schema.createTable('telemedicine_chat_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('session_id').references('id').inTable('telemedicine_sessions').onDelete('CASCADE');
    table.uuid('sender_id').notNullable();
    table.string('sender_type', 20).defaultTo('patient'); // patient, doctor
    table.text('message').notNullable();
    table.string('message_type', 30).defaultTo('text'); // text, image, file, system
    table.string('file_url', 500).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['session_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'telemedicine_chat_messages', 'telemedicine_waiting_room',
    'patient_shared_documents', 'appointment_reminders',
    'patient_messages', 'booking_requests', 'booking_slots',
  ];
  for (const t of tables) await knex.schema.dropTableIfExists(t);
}
