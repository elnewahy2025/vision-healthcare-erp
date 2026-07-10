import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Insurance & Revenue Cycle ──
  await knex.schema.createTable('insurance_companies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('code', 50).notNullable();
    table.string('contract_type', 50).defaultTo('network'); // network, direct, ppo, hmo
    table.decimal('discount_rate', 5, 2).defaultTo(0);
    table.jsonb('coverage_plans').defaultTo('[]');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'code']);
  });

  await knex.schema.createTable('insurance_claims', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('invoice_id').references('id').inTable('invoices').nullable();
    table.uuid('insurance_id').references('id').inTable('insurance_companies');
    table.string('claim_number', 50).notNullable();
    table.string('status', 30).defaultTo('draft'); // draft, submitted, acknowledged, in_review, approved, denied, paid
    table.decimal('claimed_amount', 12, 2).defaultTo(0);
    table.decimal('approved_amount', 12, 2).defaultTo(0);
    table.decimal('paid_amount', 12, 2).defaultTo(0);
    table.date('submission_date').nullable();
    table.date('response_date').nullable();
    table.text('notes').nullable();
    table.text('denial_reason').nullable();
    table.uuid('created_by').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'status']);
    table.index(['tenant_id', 'patient_id']);
  });

  // ── Inventory ──
  await knex.schema.createTable('warehouses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('code', 50).notNullable();
    table.string('type', 50).defaultTo('main'); // main, pharmacy, supplies, equipment
    table.jsonb('address').nullable();
    table.string('phone', 20).nullable();
    table.string('status', 20).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'code']);
  });

  await knex.schema.createTable('inventory_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('warehouse_id').references('id').inTable('warehouses');
    table.string('sku', 50).notNullable();
    table.string('name', 200).notNullable();
    table.string('category', 100).nullable(); // medication, supply, equipment, consumable
    table.string('unit', 30).defaultTo('piece'); // piece, box, bottle, pack
    table.integer('quantity').defaultTo(0);
    table.integer('reorder_point').defaultTo(10);
    table.decimal('unit_cost', 12, 2).defaultTo(0);
    table.decimal('unit_price', 12, 2).defaultTo(0);
    table.string('batch_number', 100).nullable();
    table.date('expiry_date').nullable();
    table.string('serial_number', 200).nullable();
    table.string('manufacturer', 200).nullable();
    table.string('supplier', 200).nullable();
    table.text('description').nullable();
    table.string('status', 20).defaultTo('active'); // active, low_stock, out_of_stock, expired, discontinued
    table.timestamp('last_restocked_at').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'warehouse_id']);
    table.index(['tenant_id', 'category']);
  });

  await knex.schema.createTable('purchase_orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('warehouse_id').references('id').inTable('warehouses');
    table.string('po_number', 50).notNullable();
    table.string('supplier', 200).notNullable();
    table.string('status', 30).defaultTo('draft'); // draft, sent, confirmed, received, cancelled
    table.decimal('total_amount', 12, 2).defaultTo(0);
    table.date('order_date').notNullable();
    table.date('expected_date').nullable();
    table.date('received_date').nullable();
    table.text('notes').nullable();
    table.uuid('created_by').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('purchase_order_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('po_id').references('id').inTable('purchase_orders').onDelete('CASCADE');
    table.uuid('item_id').references('id').inTable('inventory_items').nullable();
    table.string('item_name', 200).notNullable();
    table.string('sku', 50).nullable();
    table.integer('quantity_ordered').notNullable();
    table.integer('quantity_received').defaultTo(0);
    table.decimal('unit_cost', 12, 2).defaultTo(0);
    table.decimal('total_cost', 12, 2).defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('inventory_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('item_id').references('id').inTable('inventory_items');
    table.string('type', 30).notNullable(); // receipt, issue, adjustment, transfer, sale
    table.integer('quantity').notNullable();
    table.integer('quantity_before').defaultTo(0);
    table.integer('quantity_after').defaultTo(0);
    table.string('reference_type', 50).nullable(); // purchase_order, sale, adjustment
    table.string('reference_id').nullable();
    table.text('notes').nullable();
    table.uuid('created_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ── HR & Payroll ──
  await knex.schema.createTable('employees', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').nullable();
    table.string('employee_code', 50).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('email', 255).nullable();
    table.string('phone', 20).nullable();
    table.string('department', 100).nullable();
    table.string('position', 100).nullable();
    table.string('employment_type', 30).defaultTo('full_time'); // full_time, part_time, contract, intern
    table.date('hire_date').notNullable();
    table.date('termination_date').nullable();
    table.string('status', 20).defaultTo('active'); // active, suspended, terminated, resigned
    table.decimal('base_salary', 12, 2).defaultTo(0);
    table.string('pay_currency', 3).defaultTo('SAR');
    table.string('pay_frequency', 20).defaultTo('monthly'); // monthly, biweekly, weekly
    table.string('bank_name', 200).nullable();
    table.string('bank_account', 100).nullable();
    table.string('iban', 50).nullable();
    table.text('notes').nullable();
    table.uuid('created_by').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'department']);
    table.index(['tenant_id', 'status']);
  });

  await knex.schema.createTable('attendance', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('employee_id').references('id').inTable('employees');
    table.date('date').notNullable();
    table.timestamp('clock_in').nullable();
    table.timestamp('clock_out').nullable();
    table.string('status', 30).defaultTo('present'); // present, absent, late, half_day, on_leave
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['employee_id', 'date']);
  });

  await knex.schema.createTable('leave_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('employee_id').references('id').inTable('employees');
    table.string('leave_type', 50).defaultTo('annual'); // annual, sick, personal, maternity, bereavement, unpaid
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.integer('total_days').notNullable();
    table.string('status', 30).defaultTo('pending'); // pending, approved, rejected, cancelled
    table.text('reason').nullable();
    table.text('manager_notes').nullable();
    table.uuid('approved_by').nullable();
    table.timestamp('approved_at').nullable();
    table.uuid('created_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'employee_id']);
    table.index(['tenant_id', 'status']);
  });

  await knex.schema.createTable('payroll_runs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('period_name', 100).notNullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.date('payment_date').notNullable();
    table.string('status', 30).defaultTo('draft'); // draft, processing, completed, cancelled
    table.decimal('total_gross', 14, 2).defaultTo(0);
    table.decimal('total_deductions', 14, 2).defaultTo(0);
    table.decimal('total_net', 14, 2).defaultTo(0);
    table.uuid('created_by').nullable();
    table.timestamp('processed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('payroll_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('payroll_run_id').references('id').inTable('payroll_runs').onDelete('CASCADE');
    table.uuid('employee_id').references('id').inTable('employees');
    table.decimal('gross_pay', 12, 2).defaultTo(0);
    table.decimal('deductions', 12, 2).defaultTo(0);
    table.decimal('net_pay', 12, 2).defaultTo(0);
    table.decimal('bonuses', 12, 2).defaultTo(0);
    table.decimal('overtime', 12, 2).defaultTo(0);
    table.decimal('tax', 12, 2).defaultTo(0);
    table.jsonb('allowances').defaultTo('[]');
    table.jsonb('deductions_detail').defaultTo('[]');
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ── CRM ──
  await knex.schema.createTable('crm_campaigns', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('type', 50).defaultTo('email'); // email, sms, social, event
    table.string('status', 30).defaultTo('draft'); // draft, active, paused, completed, cancelled
    table.text('description').nullable();
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.decimal('budget', 12, 2).defaultTo(0);
    table.integer('target_count').defaultTo(0);
    table.integer('reached_count').defaultTo(0);
    table.integer('conversion_count').defaultTo(0);
    table.uuid('created_by').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('crm_patient_feedback', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.uuid('appointment_id').references('id').inTable('appointments').nullable();
    table.integer('rating').notNullable(); // 1-5
    table.text('comment').nullable();
    table.string('category', 50).nullable(); // service, facility, doctor, wait_time
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ── Document Management ──
  await knex.schema.createTable('documents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients').nullable();
    table.string('title', 200).notNullable();
    table.string('category', 100).nullable(); // lab_report, radiology_report, prescription, consent, id_scan, insurance, other
    table.string('file_name', 255).notNullable();
    table.string('file_type', 100).nullable();
    table.integer('file_size').defaultTo(0);
    table.string('storage_path', 500).notNullable();
    table.string('mime_type', 100).nullable();
    table.text('description').nullable();
    table.string('status', 30).defaultTo('active'); // active, archived, deleted
    table.integer('version').defaultTo(1);
    table.uuid('uploaded_by').nullable();
    table.jsonb('ocr_text').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'patient_id']);
    table.index(['tenant_id', 'category']);
  });

  await knex.schema.createTable('document_versions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('document_id').references('id').inTable('documents').onDelete('CASCADE');
    table.integer('version').notNullable();
    table.string('file_name', 255).notNullable();
    table.string('storage_path', 500).notNullable();
    table.integer('file_size').defaultTo(0);
    table.text('change_notes').nullable();
    table.uuid('uploaded_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['document_id', 'version']);
  });

  // ── Workflow Engine ──
  await knex.schema.createTable('workflow_definitions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('slug', 100).notNullable();
    table.string('category', 100).nullable(); // clinical, administrative, billing, lab
    table.jsonb('steps').notNullable().defaultTo('[]');
    table.jsonb('triggers').defaultTo('[]');
    table.boolean('is_active').defaultTo(true);
    table.text('description').nullable();
    table.uuid('created_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'slug']);
  });

  await knex.schema.createTable('workflow_instances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('definition_id').references('id').inTable('workflow_definitions');
    table.string('reference_type', 100).nullable();
    table.string('reference_id').nullable();
    table.string('status', 30).defaultTo('active'); // active, paused, completed, failed, cancelled
    table.jsonb('context').defaultTo('{}');
    table.string('current_step', 100).nullable();
    table.uuid('assigned_to').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'status']);
  });

  // ── Form Builder ──
  await knex.schema.createTable('form_definitions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('slug', 100).notNullable();
    table.string('category', 100).nullable(); // clinical, intake, survey, administrative
    table.jsonb('schema').notNullable().defaultTo('[]');
    table.jsonb('ui_schema').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.text('description').nullable();
    table.uuid('created_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'slug']);
  });

  await knex.schema.createTable('form_submissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('form_id').references('id').inTable('form_definitions');
    table.uuid('patient_id').references('id').inTable('patients').nullable();
    table.uuid('appointment_id').references('id').inTable('appointments').nullable();
    table.jsonb('data').notNullable();
    table.string('status', 30).defaultTo('completed'); // draft, completed
    table.uuid('submitted_by').nullable();
    table.timestamp('submitted_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ── Compliance Center ──
  await knex.schema.createTable('compliance_policies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('title', 200).notNullable();
    table.string('code', 50).notNullable();
    table.string('category', 100).nullable(); // hipaa, gdpr, data_protection, clinical_safety, general
    table.text('description').nullable();
    table.text('content').nullable();
    table.string('status', 30).defaultTo('active'); // active, draft, archived
    table.date('effective_date').nullable();
    table.date('review_date').nullable();
    table.uuid('created_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'code']);
  });

  await knex.schema.createTable('compliance_audits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('title', 200).notNullable();
    table.string('type', 50).defaultTo('internal'); // internal, external, regulatory
    table.string('status', 30).defaultTo('planned'); // planned, in_progress, completed, findings_pending, closed
    table.date('scheduled_date').nullable();
    table.date('completed_date').nullable();
    table.text('scope').nullable();
    table.text('findings').nullable();
    table.text('recommendations').nullable();
    table.string('auditor', 200).nullable();
    table.uuid('created_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('data_consent_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients');
    table.string('consent_type', 100).notNullable(); // data_processing, marketing, photo, research, telemedicine
    table.boolean('granted').notNullable();
    table.text('details').nullable();
    table.string('ip_address', 45).nullable();
    table.timestamp('consented_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'patient_id']);
  });

  await knex.schema.createTable('breach_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.string('type', 100).notNullable();
    table.date('detected_date').notNullable();
    table.date('reported_date').nullable();
    table.string('severity', 30).defaultTo('medium'); // low, medium, high, critical
    table.text('description').notNullable();
    table.text('affected_data').nullable();
    table.integer('affected_records').defaultTo(0);
    table.text('action_taken').nullable();
    table.string('status', 30).defaultTo('open'); // open, investigating, resolved, closed
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'breach_log', 'data_consent_logs', 'compliance_audits', 'compliance_policies',
    'form_submissions', 'form_definitions',
    'workflow_instances', 'workflow_definitions',
    'document_versions', 'documents',
    'crm_patient_feedback', 'crm_campaigns',
    'payroll_entries', 'payroll_runs', 'leave_requests', 'attendance', 'employees',
    'inventory_transactions', 'purchase_order_items', 'purchase_orders', 'inventory_items', 'warehouses',
    'insurance_claims', 'insurance_companies',
  ];
  for (const t of tables) await knex.schema.dropTableIfExists(t);
}
