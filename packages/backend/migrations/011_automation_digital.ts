import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Automation Rules Engine ──
  await knex.schema.createTable('automation_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('slug', 100).notNullable();
    table.string('category', 50).defaultTo('general'); // clinical, billing, operations, general
    table.string('trigger_type', 50).notNullable(); // event, schedule, manual
    table.string('trigger_event', 100).nullable(); // appointment.created, lab.completed, etc.
    table.jsonb('trigger_config').defaultTo('{}'); // cron expression, event filters
    table.jsonb('conditions').defaultTo('[]'); // conditions to evaluate
    table.text('description').nullable();
    table.boolean('is_active').defaultTo(true);
    table.integer('priority').defaultTo(0);
    table.integer('max_executions').defaultTo(0); // 0 = unlimited
    table.integer('cooldown_minutes').defaultTo(0);
    table.uuid('created_by').nullable();
    table.timestamp('last_triggered_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'slug']);
    table.index(['tenant_id', 'is_active']);
  });

  await knex.schema.createTable('automation_rule_actions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('rule_id').references('id').inTable('automation_rules').onDelete('CASCADE');
    table.integer('step_order').notNullable().defaultTo(0);
    table.string('action_type', 100).notNullable(); // send_notification, update_record, api_call, generate_report, etc.
    table.string('action_name', 200).nullable();
    table.jsonb('action_config').defaultTo('{}'); // action-specific parameters
    table.jsonb('condition_override').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['rule_id', 'step_order']);
  });

  await knex.schema.createTable('automation_execution_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('rule_id').references('id').inTable('automation_rules').onDelete('SET NULL');
    table.string('trigger_type', 50).nullable();
    table.string('reference_type', 100).nullable(); // appointment, invoice, etc.
    table.uuid('reference_id').nullable();
    table.string('status', 30).defaultTo('pending'); // pending, running, completed, failed
    table.text('input_data').nullable();
    table.text('output_data').nullable();
    table.text('error_message').nullable();
    table.integer('duration_ms').defaultTo(0);
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'rule_id', 'status']);
    table.index(['created_at']);
  });

  // ── Barcodes ──
  await knex.schema.createTable('barcode_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('code', 100).notNullable();
    table.string('category', 50).defaultTo('patient'); // patient, sample, medication, asset, label
    table.string('symbology', 50).defaultTo('code128'); // code128, qr, datamatrix, ean13, upca
    table.jsonb('fields').defaultTo('[]'); // which data fields to encode
    table.text('label_template').nullable(); // optional label layout HTML
    table.jsonb('label_config').defaultTo('{"width":50,"height":25,"unit":"mm"}');
    table.string('format', 20).defaultTo('png'); // png, svg, pdf
    table.boolean('include_human_readable').defaultTo(true);
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_default').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'code']);
  });

  await knex.schema.createTable('barcode_labels', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('template_id').references('id').inTable('barcode_templates').onDelete('SET NULL');
    table.string('reference_type', 100).notNullable(); // patient, prescription, lab_order, asset
    table.uuid('reference_id').nullable();
    table.string('barcode_data', 500).notNullable();
    table.string('barcode_image_url', 500).nullable();
    table.string('format', 20).defaultTo('png');
    table.string('status', 30).defaultTo('active'); // active, printed, expired, void
    table.timestamp('printed_at').nullable();
    table.integer('print_count').defaultTo(0);
    table.timestamp('expires_at').nullable();
    table.uuid('created_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'reference_type', 'reference_id']);
    table.index(['tenant_id', 'status']);
  });

  await knex.schema.createTable('barcode_scan_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('label_id').references('id').inTable('barcode_labels').onDelete('SET NULL');
    table.string('barcode_data', 500).notNullable();
    table.string('scanner_id', 100).nullable();
    table.string('location', 200).nullable();
    table.string('action', 50).defaultTo('scan'); // scan, verify, check_in, dispense
    table.jsonb('metadata').defaultTo('{}');
    table.string('status', 30).defaultTo('success'); // success, error, warning
    table.text('notes').nullable();
    table.uuid('scanned_by').nullable();
    table.timestamp('scanned_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'barcode_data']);
    table.index(['scanned_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('barcode_scan_logs');
  await knex.schema.dropTableIfExists('barcode_labels');
  await knex.schema.dropTableIfExists('barcode_templates');
  await knex.schema.dropTableIfExists('automation_execution_logs');
  await knex.schema.dropTableIfExists('automation_rule_actions');
  await knex.schema.dropTableIfExists('automation_rules');
}
