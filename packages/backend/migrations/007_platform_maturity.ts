import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // API Keys & Developer Portal
  await knex.schema.createTable('api_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('key_hash', 256).notNullable().unique();
    table.string('key_prefix', 8).notNullable();
    table.string('permissions', 50).defaultTo('read'); // read, write, admin
    table.jsonb('allowed_ips').defaultTo('[]');
    table.jsonb('rate_limit').defaultTo('{"requests":1000,"period":"1h"}');
    table.timestamp('expires_at').nullable();
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by').nullable();
    table.timestamp('last_used_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id']);
  });

  await knex.schema.createTable('api_key_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('api_key_id').references('id').inTable('api_keys').onDelete('CASCADE');
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('endpoint', 500).notNullable();
    table.string('method', 10).notNullable();
    table.integer('response_status').nullable();
    table.string('ip', 45).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['api_key_id', 'created_at']);
  });

  // Data Export Engine
  await knex.schema.createTable('export_definitions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('module', 100).notNullable(); // patients, appointments, emr, billing, etc
    table.string('format', 20).defaultTo('csv'); // csv, json, pdf, fhir_json, fhir_xml
    table.jsonb('columns').defaultTo('[]');
    table.jsonb('filters').defaultTo('{}');
    table.string('date_range', 30).defaultTo('all'); // all, last_30d, last_90d, custom
    table.boolean('include_deleted').defaultTo(false);
    table.boolean('is_scheduled').defaultTo(false);
    table.string('schedule_cron', 100).nullable();
    table.uuid('created_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('export_jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('export_id').references('id').inTable('export_definitions').nullable();
    table.string('module', 100).notNullable();
    table.string('format', 20).defaultTo('csv');
    table.string('status', 30).defaultTo('pending'); // pending, processing, completed, failed
    table.integer('record_count').defaultTo(0);
    table.bigInteger('file_size').defaultTo(0);
    table.string('file_path', 500).nullable();
    table.string('fhir_version', 20).nullable(); // r4, stu3
    table.text('error').nullable();
    table.string('trigger', 30).defaultTo('manual');
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.uuid('created_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'status']);
  });

  // System Monitoring
  await knex.schema.createTable('system_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('metric', 100).notNullable();
    table.decimal('value', 14, 4).defaultTo(0);
    table.jsonb('labels').defaultTo('{}');
    table.timestamp('recorded_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'metric', 'recorded_at']);
  });

  await knex.schema.createTable('system_alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('severity', 20).defaultTo('info'); // info, warning, critical
    table.string('source', 100).notNullable();
    table.string('message', 500).notNullable();
    table.jsonb('metadata').defaultTo('{}');
    table.boolean('is_acknowledged').defaultTo(false);
    table.timestamp('acknowledged_at').nullable();
    table.uuid('acknowledged_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'severity', 'created_at']);
  });

  await knex.schema.createTable('cache_configs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('endpoint_pattern', 500).notNullable();
    table.integer('ttl_seconds').defaultTo(300);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'endpoint_pattern']);
  });
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'cache_configs', 'system_alerts', 'system_metrics',
    'export_jobs', 'export_definitions',
    'api_key_logs', 'api_keys',
  ];
  for (const t of tables) await knex.schema.dropTableIfExists(t);
}
