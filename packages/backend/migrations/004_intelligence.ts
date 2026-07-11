import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── AI Hub ──
  if (!(await knex.schema.hasTable('ai_providers'))) {
    await knex.schema.createTable('ai_providers', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.string('name', 100).notNullable();
      table.string('provider', 50).notNullable(); // openai, anthropic, google, azure, custom
      table.string('api_endpoint', 500).nullable();
      table.text('api_key_encrypted').nullable();
      table.jsonb('config').defaultTo('{}');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'name']);
    });
  }

  if (!(await knex.schema.hasTable('ai_models'))) {
    await knex.schema.createTable('ai_models', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('provider_id').references('id').inTable('ai_providers').onDelete('CASCADE');
      table.string('model_name', 200).notNullable();
      table.string('display_name', 200).nullable();
      table.string('capabilities', 100).defaultTo('chat'); // chat, embedding, vision, audio
      table.decimal('cost_per_1k_input', 10, 6).defaultTo(0);
      table.decimal('cost_per_1k_output', 10, 6).defaultTo(0);
      table.integer('max_tokens').defaultTo(4096);
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('ai_assistants'))) {
    await knex.schema.createTable('ai_assistants', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.string('name', 200).notNullable();
      table.string('slug', 100).notNullable();
      table.string('category', 50).defaultTo('general'); // clinical, admin, billing, scheduling
      table.text('system_prompt').nullable();
      table.jsonb('tools').defaultTo('[]');
      table.uuid('model_id').references('id').inTable('ai_models').nullable();
      table.jsonb('config').defaultTo('{}');
      table.boolean('is_active').defaultTo(true);
      table.uuid('created_by').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'slug']);
    });
  }

  if (!(await knex.schema.hasTable('ai_requests'))) {
    await knex.schema.createTable('ai_requests', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('assistant_id').references('id').inTable('ai_assistants').nullable();
      table.uuid('model_id').references('id').inTable('ai_models').nullable();
      table.uuid('user_id').references('id').inTable('users').nullable();
      table.text('prompt').notNullable();
      table.text('response').nullable();
      table.integer('prompt_tokens').defaultTo(0);
      table.integer('completion_tokens').defaultTo(0);
      table.decimal('cost', 12, 6).defaultTo(0);
      table.integer('latency_ms').defaultTo(0);
      table.string('status', 30).defaultTo('completed'); // pending, processing, completed, failed
      table.text('error').nullable();
      table.string('source', 50).nullable(); // clinical_assistant, billing_assistant, etc.
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'created_at']);
    });
  }

  if (!(await knex.schema.hasTable('ai_cost_logs'))) {
    await knex.schema.createTable('ai_cost_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.date('date').notNullable();
      table.string('source', 50).notNullable();
      table.decimal('total_cost', 12, 6).defaultTo(0);
      table.integer('total_requests').defaultTo(0);
      table.integer('total_tokens').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'date', 'source']);
    });
  }

  // ── BI Dashboards ──
  if (!(await knex.schema.hasTable('dashboard_definitions'))) {
    await knex.schema.createTable('dashboard_definitions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.string('name', 200).notNullable();
      table.string('slug', 100).notNullable();
      table.string('category', 50).defaultTo('executive'); // executive, operational, clinical, financial
      table.text('description').nullable();
      table.jsonb('layout').defaultTo('[]');
      table.boolean('is_default').defaultTo(false);
      table.string('refresh_interval', 20).defaultTo('5m'); // 1m, 5m, 15m, 1h, manual
      table.uuid('created_by').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'slug']);
    });
  }

  if (!(await knex.schema.hasTable('dashboard_widgets'))) {
    await knex.schema.createTable('dashboard_widgets', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('dashboard_id').references('id').inTable('dashboard_definitions').onDelete('CASCADE');
      table.string('title', 200).notNullable();
      table.string('widget_type', 50).notNullable(); // kpi, chart, table, list, metric
      table.string('data_source', 100).notNullable(); // appointments, revenue, patients, clinical
      table.jsonb('config').defaultTo('{}');
      table.jsonb('query').defaultTo('{}');
      table.integer('width').defaultTo(4); // grid columns 1-12
      table.integer('height').defaultTo(2); // grid rows
      table.integer('position_x').defaultTo(0);
      table.integer('position_y').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  // ── Report Builder ──
  if (!(await knex.schema.hasTable('report_definitions'))) {
    await knex.schema.createTable('report_definitions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.string('name', 200).notNullable();
      table.string('slug', 100).notNullable();
      table.string('category', 50).defaultTo('clinical'); // clinical, financial, operational, hr, inventory
      table.text('description').nullable();
      table.jsonb('query_config').defaultTo('{}');
      table.jsonb('columns').defaultTo('[]');
      table.jsonb('filters').defaultTo('[]');
      table.jsonb('sorting').defaultTo('[]');
      table.string('export_formats', 100).defaultTo('["csv","pdf","excel"]');
      table.boolean('is_scheduled').defaultTo(false);
      table.uuid('created_by').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'slug']);
    });
  }

  if (!(await knex.schema.hasTable('report_schedules'))) {
    await knex.schema.createTable('report_schedules', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('report_id').references('id').inTable('report_definitions').onDelete('CASCADE');
      table.string('cron', 100).notNullable();
      table.jsonb('recipients').defaultTo('[]');
      table.string('format', 20).defaultTo('pdf'); // pdf, csv, excel
      table.jsonb('params').defaultTo('{}');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('last_run_at').nullable();
      table.timestamp('next_run_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('report_executions'))) {
    await knex.schema.createTable('report_executions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('report_id').references('id').inTable('report_definitions').onDelete('CASCADE');
      table.string('status', 30).defaultTo('pending'); // pending, processing, completed, failed
      table.string('format', 20).defaultTo('pdf');
      table.text('error').nullable();
      table.string('output_path', 500).nullable();
      table.integer('row_count').defaultTo(0);
      table.string('trigger', 30).defaultTo('manual'); // manual, scheduled
      table.uuid('created_by').nullable();
      table.timestamp('started_at').nullable();
      table.timestamp('completed_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // ── Integration Hub ──
  if (!(await knex.schema.hasTable('integration_definitions'))) {
    await knex.schema.createTable('integration_definitions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 200).notNullable();
      table.string('provider', 100).notNullable(); // stripe, twilio, pacs, lab_system, etc
      table.string('category', 50).defaultTo('payment'); // payment, communication, clinical, device
      table.text('description').nullable();
      table.jsonb('config_schema').defaultTo('{}');
      table.jsonb('available_actions').defaultTo('[]');
      table.string('icon', 100).nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('integration_connections'))) {
    await knex.schema.createTable('integration_connections', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('definition_id').references('id').inTable('integration_definitions');
      table.string('name', 200).notNullable();
      table.jsonb('credentials_encrypted').defaultTo('{}');
      table.jsonb('config').defaultTo('{}');
      table.string('status', 30).defaultTo('disconnected'); // connected, disconnected, error
      table.text('last_error').nullable();
      table.timestamp('last_sync_at').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('webhooks'))) {
    await knex.schema.createTable('webhooks', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('integration_id').references('id').inTable('integration_connections').nullable();
      table.string('name', 200).notNullable();
      table.string('url', 500).notNullable();
      table.string('secret', 500).nullable();
      table.jsonb('events').defaultTo('[]');
      table.jsonb('headers').defaultTo('{}');
      table.string('status', 30).defaultTo('active'); // active, paused, disabled
      table.integer('retry_count').defaultTo(3);
      table.integer('timeout_seconds').defaultTo(30);
      table.timestamp('last_triggered_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('webhook_logs'))) {
    await knex.schema.createTable('webhook_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('webhook_id').references('id').inTable('webhooks').onDelete('CASCADE');
      table.string('event', 100).notNullable();
      table.text('request_body').nullable();
      table.text('response_body').nullable();
      table.integer('response_status').nullable();
      table.string('status', 30).defaultTo('pending'); // pending, delivered, failed, retrying
      table.integer('attempt').defaultTo(1);
      table.text('error').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'webhook_id', 'created_at']);
    });
  }

  // ── Patient Portal enhancements ──
  if (!(await knex.schema.hasTable('portal_sessions'))) {
    await knex.schema.createTable('portal_sessions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('patient_id').references('id').inTable('patients').onDelete('CASCADE');
      table.string('token', 500).notNullable();
      table.string('otp', 6).nullable();
      table.timestamp('otp_expires_at').nullable();
      table.string('ip_address', 45).nullable();
      table.string('user_agent', 500).nullable();
      table.timestamp('last_activity_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['patient_id']);
      table.index(['token']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'portal_sessions',
    'webhook_logs', 'webhooks', 'integration_connections', 'integration_definitions',
    'report_executions', 'report_schedules', 'report_definitions',
    'dashboard_widgets', 'dashboard_definitions',
    'ai_cost_logs', 'ai_requests', 'ai_assistants', 'ai_models', 'ai_providers',
  ];
  for (const t of tables) await knex.schema.dropTableIfExists(t);
}
