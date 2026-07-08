import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Laboratory ──
  await knex.schema.createTable('lab_orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('doctor_id').references('id').inTable('users');
    table.uuid('appointment_id').references('id').inTable('appointments').nullable();
    table.uuid('emr_record_id').references('id').inTable('emr_records').nullable();
    table.string('order_number', 50).notNullable();
    table.string('status', 30).defaultTo('ordered'); // ordered, collected, processing, completed, cancelled
    table.string('priority', 20).defaultTo('routine'); // routine, urgent, stat
    table.date('order_date').notNullable();
    table.timestamp('collected_at').nullable();
    table.timestamp('completed_at').nullable();
    table.text('clinical_notes').nullable();
    table.text('results_summary').nullable();
    table.jsonb('results').defaultTo('[]');
    table.uuid('collected_by').nullable();
    table.uuid('reviewed_by').nullable();
    table.uuid('created_by').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'patient_id']);
    table.index(['tenant_id', 'status']);
  });

  await knex.schema.createTable('lab_tests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('order_id').references('id').inTable('lab_orders').onDelete('CASCADE');
    table.string('test_code', 50).notNullable();
    table.string('test_name', 200).notNullable();
    table.string('specimen_type', 100).nullable();
    table.text('result_value').nullable();
    table.string('result_unit', 50).nullable();
    table.string('reference_range', 200).nullable();
    table.string('status', 30).defaultTo('pending'); // pending, completed, abnormal, cancelled
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('lab_catalog', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('test_code', 50).notNullable();
    table.string('test_name', 200).notNullable();
    table.string('category', 100).nullable(); // hematology, chemistry, microbiology, etc.
    table.string('specimen_type', 100).nullable();
    table.string('reference_range', 200).nullable();
    table.string('unit', 50).nullable();
    table.decimal('price', 12, 2).defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'test_code']);
  });

  // ── Radiology ──
  await knex.schema.createTable('radiology_orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('doctor_id').references('id').inTable('users');
    table.uuid('appointment_id').references('id').inTable('appointments').nullable();
    table.string('order_number', 50).notNullable();
    table.string('study_type', 100).notNullable(); // X-ray, MRI, CT, Ultrasound, etc.
    table.string('body_part', 100).nullable();
    table.string('status', 30).defaultTo('ordered'); // ordered, scheduled, in_progress, completed, reviewed, cancelled
    table.string('priority', 20).defaultTo('routine');
    table.date('order_date').notNullable();
    table.date('scheduled_date').nullable();
    table.text('clinical_indication').nullable();
    table.text('findings').nullable();
    table.text('impression').nullable();
    table.text('report').nullable();
    table.string('dicom_link').nullable();
    table.uuid('technician_id').nullable();
    table.uuid('radiologist_id').nullable();
    table.uuid('created_by').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'patient_id']);
    table.index(['tenant_id', 'status']);
  });

  // ── Pharmacy ──
  await knex.schema.createTable('pharmacy_prescriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('doctor_id').references('id').inTable('users');
    table.uuid('emr_record_id').references('id').inTable('emr_records').nullable();
    table.string('prescription_number', 50).notNullable();
    table.string('status', 30).defaultTo('active'); // active, dispensed, partially_dispensed, cancelled, expired
    table.text('notes').nullable();
    table.uuid('created_by').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'patient_id']);
    table.index(['tenant_id', 'status']);
  });

  await knex.schema.createTable('pharmacy_prescription_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('prescription_id').references('id').inTable('pharmacy_prescriptions').onDelete('CASCADE');
    table.string('drug_name', 200).notNullable();
    table.string('dosage', 100).notNullable();
    table.string('route', 100).nullable();
    table.string('frequency', 100).nullable();
    table.string('duration', 100).nullable();
    table.integer('quantity').notNullable();
    table.integer('quantity_dispensed').defaultTo(0);
    table.integer('refills').defaultTo(0);
    table.text('instructions').nullable();
    table.string('status', 30).defaultTo('pending'); // pending, dispensed, not_available, cancelled
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('pharmacy_inventory', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('drug_name', 200).notNullable();
    table.string('generic_name', 200).nullable();
    table.string('brand_name', 200).nullable();
    table.string('dosage_form', 100).nullable();
    table.string('strength', 100).nullable();
    table.integer('stock_quantity').defaultTo(0);
    table.integer('reorder_level').defaultTo(10);
    table.decimal('unit_price', 12, 2).defaultTo(0);
    table.string('batch_number', 100).nullable();
    table.date('expiry_date').nullable();
    table.string('manufacturer', 200).nullable();
    table.boolean('requires_prescription').defaultTo(true);
    table.string('status', 20).defaultTo('active'); // active, discontinued, out_of_stock
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'drug_name']);
  });

  // ── Queue Management ──
  await knex.schema.createTable('queue_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('branch_id').references('id').inTable('branches').nullable();
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('appointment_id').references('id').inTable('appointments').nullable();
    table.uuid('doctor_id').references('id').inTable('users').nullable();
    table.uuid('service_id').nullable();
    table.string('queue_number', 20).notNullable();
    table.string('service_type', 50).defaultTo('consultation'); // consultation, lab, radiology, pharmacy, nursing
    table.string('status', 30).defaultTo('waiting'); // waiting, called, in_progress, completed, skipped, no_show
    table.integer('priority').defaultTo(0);
    table.integer('position').defaultTo(0);
    table.timestamp('called_at').nullable();
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'branch_id', 'status']);
  });

  // ── Referral Management ──
  await knex.schema.createTable('referrals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('referring_doctor_id').references('id').inTable('users');
    table.uuid('receiving_doctor_id').references('id').inTable('users').nullable();
    table.string('referral_number', 50).notNullable();
    table.string('referral_type', 50).defaultTo('specialist'); // specialist, hospital, lab, radiology, physiotherapy, other
    table.string('priority', 20).defaultTo('normal'); // normal, urgent, emergency
    table.string('status', 30).defaultTo('pending'); // pending, accepted, declined, completed, cancelled
    table.text('reason').nullable();
    table.text('clinical_notes').nullable();
    table.text('feedback').nullable();
    table.date('referral_date').notNullable();
    table.date('appointment_date').nullable();
    table.string('external_facility').nullable();
    table.string('external_doctor').nullable();
    table.boolean('consent_obtained').defaultTo(true);
    table.uuid('created_by').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'patient_id']);
    table.index(['tenant_id', 'status']);
  });

  // ── Notifications ──
  await knex.schema.createTable('notification_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('code', 100).notNullable();
    table.string('name', 200).notNullable();
    table.string('channel', 30).notNullable(); // sms, email, whatsapp, push
    table.string('subject', 300).nullable();
    table.text('body_template').notNullable();
    table.jsonb('variables').defaultTo('[]');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'code', 'channel']);
  });

  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').nullable();
    table.uuid('patient_id').references('id').inTable('patients').nullable();
    table.string('channel', 30).notNullable();
    table.string('recipient', 200).notNullable();
    table.string('subject', 300).nullable();
    table.text('body').notNullable();
    table.string('status', 30).defaultTo('pending'); // pending, sent, failed, read
    table.string('reference_type', 100).nullable(); // appointment, invoice, lab, etc.
    table.string('reference_id').nullable();
    table.timestamp('sent_at').nullable();
    table.timestamp('read_at').nullable();
    table.text('error_message').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'status']);
    table.index(['tenant_id', 'user_id']);
  });

  // ── Nursing ──
  await knex.schema.createTable('nursing_tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('appointment_id').references('id').inTable('appointments').nullable();
    table.uuid('assigned_to').references('id').inTable('users').nullable();
    table.uuid('assigned_by').references('id').inTable('users').nullable();
    table.string('title', 200).notNullable();
    table.text('description').nullable();
    table.string('category', 50).defaultTo('general'); // medication, wound_care, monitoring, vital_signs, procedure, education
    table.string('priority', 20).defaultTo('normal');
    table.string('status', 30).defaultTo('pending'); // pending, in_progress, completed, cancelled
    table.timestamp('due_at').nullable();
    table.timestamp('completed_at').nullable();
    table.text('completion_notes').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'assigned_to', 'status']);
    table.index(['tenant_id', 'patient_id']);
  });

  await knex.schema.createTable('nursing_notes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('appointment_id').references('id').inTable('appointments').nullable();
    table.uuid('nurse_id').references('id').inTable('users');
    table.text('observation').nullable();
    table.text('intervention').nullable();
    table.text('response').nullable();
    table.text('plan').nullable();
    table.jsonb('vitals').nullable();
    table.string('shift', 20).nullable(); // morning, evening, night
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'patient_id']);
  });

  // ── Home Visits ──
  await knex.schema.createTable('home_visits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('assigned_to').references('id').inTable('users');
    table.uuid('created_by').references('id').inTable('users').nullable();
    table.string('visit_number', 50).notNullable();
    table.string('status', 30).defaultTo('scheduled'); // scheduled, in_progress, completed, cancelled
    table.string('visit_type', 50).defaultTo('checkup'); // checkup, medication, wound_care, monitoring, emergency
    table.date('scheduled_date').notNullable();
    table.string('scheduled_time', 10).nullable(); // 09:00
    table.text('address').notNullable();
    table.text('notes').nullable();
    table.text('clinical_notes').nullable();
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.decimal('latitude', 10, 7).nullable();
    table.decimal('longitude', 10, 7).nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'assigned_to', 'status']);
    table.index(['tenant_id', 'patient_id']);
  });

  // ── Telemedicine ──
  await knex.schema.createTable('telemedicine_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('doctor_id').references('id').inTable('users');
    table.uuid('appointment_id').references('id').inTable('appointments').nullable();
    table.string('session_id', 200).notNullable();
    table.string('room_name', 200).notNullable();
    table.string('status', 30).defaultTo('scheduled'); // scheduled, active, completed, cancelled, missed
    table.string('provider', 50).defaultTo('internal'); // internal, zoom, teams, jitsi
    table.string('meeting_link', 500).nullable();
    table.timestamp('started_at').nullable();
    table.timestamp('ended_at').nullable();
    table.integer('duration_seconds').defaultTo(0);
    table.boolean('recording_enabled').defaultTo(false);
    table.string('recording_url', 500).nullable();
    table.text('notes').nullable();
    table.uuid('created_by').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'doctor_id', 'status']);
    table.index(['tenant_id', 'patient_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('telemedicine_sessions');
  await knex.schema.dropTableIfExists('home_visits');
  await knex.schema.dropTableIfExists('nursing_notes');
  await knex.schema.dropTableIfExists('nursing_tasks');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('notification_templates');
  await knex.schema.dropTableIfExists('referrals');
  await knex.schema.dropTableIfExists('queue_entries');
  await knex.schema.dropTableIfExists('pharmacy_inventory');
  await knex.schema.dropTableIfExists('pharmacy_prescription_items');
  await knex.schema.dropTableIfExists('pharmacy_prescriptions');
  await knex.schema.dropTableIfExists('radiology_orders');
  await knex.schema.dropTableIfExists('lab_catalog');
  await knex.schema.dropTableIfExists('lab_tests');
  await knex.schema.dropTableIfExists('lab_orders');
}
