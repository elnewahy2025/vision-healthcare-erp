import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // AI Clinical Notes
  await knex.schema.createTable('ai_clinical_notes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients').onDelete('CASCADE');
    table.uuid('appointment_id').references('id').inTable('appointments').onDelete('SET NULL').nullable();
    table.uuid('doctor_id').references('id').inTable('users').onDelete('SET NULL').nullable();
    table.string('note_type', 30).defaultTo('consultation'); // consultation | follow_up | discharge | referral
    table.text('raw_notes').nullable(); // Doctor's raw input/transcription
    table.text('generated_note').nullable(); // AI-generated clinical note
    table.text('summary').nullable(); // Brief summary
    table.jsonb('structured_data').nullable(); // Structured medical data
    table.string('status', 20).defaultTo('draft'); // draft | reviewed | finalized
    table.text('doctor_corrections').nullable(); // Doctor's edits to AI output
    table.string('ai_model_used', 50).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'patient_id']);
    table.index(['tenant_id', 'appointment_id']);
  });

  // AI Diagnosis Suggestions
  await knex.schema.createTable('ai_diagnosis_suggestions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients').onDelete('CASCADE');
    table.uuid('appointment_id').references('id').inTable('appointments').onDelete('SET NULL').nullable();
    table.uuid('doctor_id').references('id').inTable('users').onDelete('SET NULL').nullable();
    table.text('symptoms').notNullable(); // Input symptoms
    table.jsonb('suggestions').notNullable(); // [{code, label, confidence, icd10_code}]
    table.string('selected_code', 20).nullable(); // What doctor selected
    table.boolean('was_accepted').nullable();
    table.text('doctor_feedback').nullable();
    table.string('ai_model_used', 50).nullable();
    table.integer('response_time_ms').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'patient_id']);
  });

  // AI Predictions
  await knex.schema.createTable('ai_predictions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('prediction_type', 30).notNullable(); // no_show | revenue_forecast | patient_risk | readmission | occupancy
    table.uuid('related_id').nullable(); // patient_id, appointment_id, etc.
    table.string('related_type', 30).nullable(); // patient | appointment | revenue
    table.jsonb('features').nullable(); // Input features used
    table.jsonb('result').notNullable(); // Prediction result with confidence
    table.decimal('confidence', 5, 4).defaultTo(0); // 0-1 scale
    table.boolean('was_accurate').nullable(); // Feedback after outcome known
    table.timestamp('prediction_date').notNullable();
    table.date('target_date').nullable(); // Date the prediction applies to
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'prediction_type']);
    table.index(['tenant_id', 'prediction_date']);
  });

  // AI Smart Schedules
  await knex.schema.createTable('ai_smart_schedules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.date('schedule_date').notNullable();
    table.jsonb('optimized_slots').notNullable(); // [{start, end, doctor_id, priority, estimated_duration}]
    table.jsonb('constraints').nullable(); // Doctor preferences, room availability, etc.
    table.decimal('expected_utilization', 5, 2).nullable();
    table.decimal('expected_revenue', 12, 2).nullable();
    table.boolean('is_applied').defaultTo(false);
    table.timestamp('applied_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'schedule_date']);
  });

  // Patient Risk Scores
  await knex.schema.createTable('patient_risk_scores', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients').onDelete('CASCADE');
    table.string('risk_type', 30).notNullable(); // readmission | complication | chronic_decompensation | no_show
    table.decimal('risk_score', 5, 4).notNullable(); // 0-1
    table.string('risk_level', 20).notNullable(); // low | moderate | high | critical
    table.jsonb('factors').nullable(); // Contributing factors
    table.text('recommendation').nullable(); // Suggested intervention
    table.date('calculated_date').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'patient_id', 'risk_type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('patient_risk_scores');
  await knex.schema.dropTableIfExists('ai_smart_schedules');
  await knex.schema.dropTableIfExists('ai_predictions');
  await knex.schema.dropTableIfExists('ai_diagnosis_suggestions');
  await knex.schema.dropTableIfExists('ai_clinical_notes');
}
