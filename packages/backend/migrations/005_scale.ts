import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. SaaS Billing Engine
  await knex.schema.createTable('subscription_plans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 200).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.string('category', 50).defaultTo('clinical'); // clinical, operations, intelligence, enterprise
    table.text('description').nullable();
    table.decimal('price_monthly', 10, 2).defaultTo(0);
    table.decimal('price_yearly', 10, 2).defaultTo(0);
    table.string('currency', 3).defaultTo('SAR');
    table.jsonb('modules').defaultTo('[]'); // which modules are included
    table.jsonb('limits').defaultTo('{}'); // user limits, storage, etc.
    table.jsonb('features').defaultTo('[]');
    table.integer('max_users').defaultTo(5);
    table.integer('max_branches').defaultTo(1);
    table.integer('max_storage_gb').defaultTo(10);
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('tenant_subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('plan_id').references('id').inTable('subscription_plans');
    table.string('status', 30).defaultTo('active'); // active, past_due, cancelled, expired, trial
    table.string('billing_cycle', 20).defaultTo('monthly'); // monthly, yearly
    table.decimal('amount', 10, 2).defaultTo(0);
    table.timestamp('current_period_start').notNullable();
    table.timestamp('current_period_end').notNullable();
    table.timestamp('trial_ends_at').nullable();
    table.timestamp('cancelled_at').nullable();
    table.jsonb('addons').defaultTo('[]');
    table.jsonb('discounts').defaultTo('[]');
    table.string('payment_provider', 50).nullable(); // stripe, manual
    table.string('payment_provider_id', 200).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id']);
  });

  await knex.schema.createTable('usage_records', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('subscription_id').references('id').inTable('tenant_subscriptions').onDelete('CASCADE');
    table.string('metric', 100).notNullable(); // api_calls, storage_gb, users_active, appointments
    table.integer('quantity').defaultTo(0);
    table.date('record_date').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'metric', 'record_date']);
  });

  await knex.schema.createTable('subscription_invoices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('subscription_id').references('id').inTable('tenant_subscriptions');
    table.string('invoice_number', 50).notNullable();
    table.decimal('amount', 10, 2).defaultTo(0);
    table.decimal('tax', 10, 2).defaultTo(0);
    table.decimal('total', 10, 2).defaultTo(0);
    table.string('status', 30).defaultTo('pending'); // pending, paid, failed, refunded
    table.string('payment_method', 50).nullable();
    table.timestamp('paid_at').nullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 2. White-Label Customization
  await knex.schema.createTable('tenant_domains', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('domain', 255).notNullable().unique();
    table.boolean('is_primary').defaultTo(false);
    table.boolean('is_verified').defaultTo(false);
    table.string('verification_token', 100).nullable();
    table.string('ssl_status', 30).defaultTo('pending'); // pending, active, failed
    table.timestamp('verified_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id']);
  });

  await knex.schema.createTable('tenant_branding', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').unique();
    table.string('brand_name', 200).nullable();
    table.string('logo_url', 500).nullable();
    table.string('favicon_url', 500).nullable();
    table.string('primary_color', 7).defaultTo('#0D9488');
    table.string('secondary_color', 7).defaultTo('#14B8A6');
    table.string('accent_color', 7).defaultTo('#F59E0B');
    table.string('font_family', 100).defaultTo('Inter');
    table.text('custom_css').nullable();
    table.text('custom_js').nullable();
    table.jsonb('email_templates').defaultTo('{}');
    table.jsonb('login_page').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 3. Compliance Reports & Data Retention
  await knex.schema.createTable('compliance_reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('title', 200).notNullable();
    table.string('type', 50).notNullable(); // hipaa, gdpr, internal, regulatory, custom
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.string('status', 30).defaultTo('draft'); // draft, generated, reviewed, archived
    table.jsonb('data').defaultTo('{}');
    table.text('findings').nullable();
    table.text('recommendations').nullable();
    table.string('format', 20).defaultTo('pdf');
    table.string('output_path', 500).nullable();
    table.uuid('generated_by').nullable();
    table.timestamp('generated_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('data_retention_policies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('entity', 100).notNullable(); // patients, emr_records, invoices, audit_logs
    table.integer('retention_days').notNullable();
    table.string('action', 30).defaultTo('archive'); // archive, anonymize, delete
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_cleanup_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'entity']);
  });

  await knex.schema.createTable('business_associate_agreements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('organization_name', 200).notNullable();
    table.string('contact_name', 200).nullable();
    table.string('contact_email', 255).nullable();
    table.text('scope').nullable();
    table.date('executed_date').nullable();
    table.date('expiry_date').nullable();
    table.string('status', 30).defaultTo('draft'); // draft, executed, expired, terminated
    table.text('terms').nullable();
    table.string('document_path', 500).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 4. Disaster Recovery & Backup
  await knex.schema.createTable('backup_configs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('type', 30).defaultTo('full'); // full, incremental, logical
    table.string('schedule', 50).defaultTo('0 2 * * *'); // cron
    table.integer('retention_days').defaultTo(30);
    table.string('storage_location', 500).defaultTo('minio://backups');
    table.string('encryption_key_ref', 200).nullable();
    table.jsonb('include_schemas').defaultTo('["public"]');
    table.jsonb('exclude_tables').defaultTo('[]');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_backup_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('backup_executions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('config_id').references('id').inTable('backup_configs');
    table.string('status', 30).defaultTo('pending'); // pending, running, completed, failed
    table.string('type', 30).defaultTo('full');
    table.bigInteger('size_bytes').defaultTo(0);
    table.string('file_path', 500).nullable();
    table.string('checksum', 128).nullable();
    table.text('error').nullable();
    table.string('trigger', 30).defaultTo('scheduled'); // scheduled, manual
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'status']);
  });

  await knex.schema.createTable('dr_configs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').unique();
    table.string('replication_region', 100).defaultTo('auto');
    table.string('failover_strategy', 50).defaultTo('manual'); // manual, automatic
    table.integer('rpo_minutes').defaultTo(60); // Recovery Point Objective
    table.integer('rto_minutes').defaultTo(120); // Recovery Time Objective
    table.boolean('cross_region_replication').defaultTo(false);
    table.string('secondary_region', 100).nullable();
    table.string('status', 30).defaultTo('healthy'); // healthy, degraded, failed, recovering
    table.timestamp('last_dr_test_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 5. Multi-Region
  await knex.schema.createTable('regions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 50).notNullable().unique();
    table.string('name', 200).notNullable();
    table.string('provider', 50).defaultTo('aws'); // aws, azure, gcp, self
    table.string('location', 100).nullable();
    table.jsonb('config').defaultTo('{}');
    table.jsonb('compliance_flags').defaultTo('[]'); // gdpr, hipaa, saudia_nic, etc
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('tenant_data_residency', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').unique();
    table.uuid('primary_region_id').references('id').inTable('regions');
    table.uuid('backup_region_id').references('id').inTable('regions').nullable();
    table.jsonb('data_classifications').defaultTo('{}');
    table.string('compliance_framework', 50).defaultTo('hipaa'); // hipaa, gdpr, both
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Seed default subscription plans
  const plans = [
    { name: 'Starter', slug: 'starter', category: 'clinical', price_monthly: 299, price_yearly: 2990, max_users: 5, max_branches: 1, max_storage_gb: 10, modules: '["patient","appointment","emr","billing"]', features: '["basic_support","email_notifications"]', sort_order: 1 },
    { name: 'Professional', slug: 'professional', category: 'clinical', price_monthly: 799, price_yearly: 7990, max_users: 25, max_branches: 5, max_storage_gb: 50, modules: '["patient","appointment","emr","billing","laboratory","radiology","pharmacy","queue"]', features: '["priority_support","sms_notifications","basic_reports"]', sort_order: 2 },
    { name: 'Enterprise', slug: 'enterprise', category: 'enterprise', price_monthly: 1999, price_yearly: 19990, max_users: 999, max_branches: 999, max_storage_gb: 500, modules: '["*"]', features: '["dedicated_support","white_label","all_modules","api_access","custom_integrations"]', sort_order: 3 },
  ];

  for (const plan of plans) {
    await knex('subscription_plans').insert({
      name: plan.name, slug: plan.slug, category: plan.category,
      price_monthly: plan.price_monthly, price_yearly: plan.price_yearly,
      max_users: plan.max_users, max_branches: plan.max_branches,
      max_storage_gb: plan.max_storage_gb, modules: plan.modules,
      features: plan.features, sort_order: plan.sort_order,
      is_active: true
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'tenant_data_residency', 'regions',
    'dr_configs', 'backup_executions', 'backup_configs',
    'business_associate_agreements', 'data_retention_policies', 'compliance_reports',
    'tenant_branding', 'tenant_domains',
    'subscription_invoices', 'usage_records', 'tenant_subscriptions', 'subscription_plans',
  ];
  for (const t of tables) await knex.schema.dropTableIfExists(t);
}
