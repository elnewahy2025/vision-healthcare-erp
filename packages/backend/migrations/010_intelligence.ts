import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Data Warehouse — aggregated analytics
  await knex.schema.createTable('dw_appointment_stats', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.date('date').notNullable();
    table.integer('total_appointments').defaultTo(0);
    table.integer('completed_appointments').defaultTo(0);
    table.integer('cancelled_appointments').defaultTo(0);
    table.integer('no_show_appointments').defaultTo(0);
    table.decimal('avg_duration_minutes', 8, 2).defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'date']);
  });

  await knex.schema.createTable('dw_revenue_stats', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.date('date').notNullable();
    table.decimal('total_revenue', 14, 2).defaultTo(0);
    table.decimal('collected_revenue', 14, 2).defaultTo(0);
    table.decimal('pending_revenue', 14, 2).defaultTo(0);
    table.integer('invoice_count').defaultTo(0);
    table.integer('paid_invoice_count').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'date']);
  });

  await knex.schema.createTable('dw_patient_stats', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.date('date').notNullable();
    table.integer('new_patients').defaultTo(0);
    table.integer('total_active_patients').defaultTo(0);
    table.decimal('avg_age', 6, 2).defaultTo(0);
    table.jsonb('gender_distribution').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'date']);
  });

  // Automation Rules
  await knex.schema.createTable('automation_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('trigger_event', 100).notNullable(); // appointment.created, lab.result_ready, invoice.paid
    table.string('action_type', 50).notNullable(); // send_notification, create_task, update_record, webhook
    table.jsonb('action_config').defaultTo('{}');
    table.jsonb('conditions').defaultTo('[]');
    table.boolean('is_active').defaultTo(true);
    table.integer('execution_count').defaultTo(0);
    table.timestamp('last_executed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'trigger_event']);
  });

  await knex.schema.createTable('automation_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('rule_id').references('id').inTable('automation_rules').onDelete('CASCADE');
    table.string('event', 100).notNullable();
    table.string('status', 30).defaultTo('success'); // success, failed, skipped
    table.text('result').nullable();
    table.text('error').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['rule_id', 'created_at']);
  });

  // Barcode/QR Registry
  await knex.schema.createTable('barcode_registry', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('code', 200).notNullable().unique();
    table.string('type', 30).notNullable(); // qr, code128, ean13
    table.string('entity_type', 50).notNullable(); // patient, inventory_item, document, appointment
    table.string('entity_id').notNullable();
    table.text('payload').nullable();
    table.string('label', 200).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'entity_type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'barcode_registry', 'automation_logs', 'automation_rules',
    'dw_patient_stats', 'dw_revenue_stats', 'dw_appointment_stats',
  ];
  for (const t of tables) await knex.schema.dropTableIfExists(t);
}
