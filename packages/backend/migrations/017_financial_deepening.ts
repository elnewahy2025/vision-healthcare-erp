import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Expense categories
  if (!(await knex.schema.hasTable('expense_categories'))) {
    await knex.schema.createTable('expense_categories', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').nullable();
      table.string('name', 100).notNullable();
      table.string('code', 50).notNullable();
      table.string('type', 30).defaultTo('operational'); // operational | payroll | medical_supply | admin | facility | marketing | other
      table.string('description', 255).nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'code']);
    });
  }

  // Expenses
  if (!(await knex.schema.hasTable('expenses'))) {
    await knex.schema.createTable('expenses', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL').nullable();
      table.uuid('category_id').references('id').inTable('expense_categories').onDelete('SET NULL').nullable();
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL').nullable();
      table.string('expense_number', 30).notNullable();
      table.string('title', 200).notNullable();
      table.text('description').nullable();
      table.decimal('amount', 12, 2).notNullable();
      table.string('currency', 3).defaultTo('EGP');
      table.date('expense_date').notNullable();
      table.string('payment_method', 30).defaultTo('cash'); // cash | bank | credit | fawry
      table.string('status', 20).defaultTo('pending'); // pending | approved | rejected | paid
      table.string('vendor_name', 150).nullable();
      table.string('vendor_tax_id', 30).nullable();
      table.string('receipt_url', 500).nullable();
      table.string('tax_type', 30).nullable(); // vat_inclusive | vat_exclusive | exempt
      table.decimal('tax_amount', 12, 2).defaultTo(0);
      table.jsonb('metadata').nullable();
      table.timestamp('approved_at').nullable();
      table.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL').nullable();
      table.timestamp('paid_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'expense_date']);
      table.index(['tenant_id', 'status']);
      table.index(['tenant_id', 'category_id']);
    });
  }

  // ETA (Egyptian Tax Authority) e-invoices
  if (!(await knex.schema.hasTable('eta_invoices'))) {
    await knex.schema.createTable('eta_invoices', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('invoice_id').references('id').inTable('invoices').onDelete('SET NULL').nullable();
      table.string('eta_uuid', 100).nullable().unique(); // ETA-assigned UUID
      table.string('eta_invoice_number', 50).nullable(); // ETA-assigned number
      table.string('document_type', 10).defaultTo('I'); // I=Invoice, C=Credit Note, D=Debit Note
      table.string('transaction_type', 10).defaultTo('S'); // S=Sale, P=Purchase, R=Return
      table.string('status', 20).defaultTo('draft'); // draft | submitted | approved | rejected | cancelled
      table.text('eta_json').nullable(); // Full ETA JSON payload
      table.text('eta_response').nullable(); // ETA API response
      table.string('qr_code_data', 500).nullable(); // TLV QR code data
      table.text('qr_code_image').nullable(); // Base64 QR image
      table.text('error_message').nullable();
      table.string('rejection_reason', 500).nullable();
      table.timestamp('submitted_at').nullable();
      table.timestamp('approved_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'status']);
      table.index(['eta_uuid']);
    });
  }

  // Budget plans
  if (!(await knex.schema.hasTable('budget_plans'))) {
    await knex.schema.createTable('budget_plans', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL').nullable();
      table.string('name', 200).notNullable();
      table.string('period', 20).notNullable(); // monthly | quarterly | yearly
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.decimal('projected_revenue', 14, 2).defaultTo(0);
      table.decimal('projected_expenses', 14, 2).defaultTo(0);
      table.decimal('approved_budget', 14, 2).defaultTo(0);
      table.string('status', 20).defaultTo('draft'); // draft | active | closed
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'period']);
    });
  }

  // Budget line items
  if (!(await knex.schema.hasTable('budget_line_items'))) {
    await knex.schema.createTable('budget_line_items', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('budget_id').references('id').inTable('budget_plans').onDelete('CASCADE');
      table.uuid('category_id').references('id').inTable('expense_categories').onDelete('SET NULL');
      table.string('item_name', 200).notNullable();
      table.decimal('budgeted_amount', 12, 2).notNullable();
      table.decimal('actual_amount', 12, 2).defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Add columns to payment_transactions for extended tracking
  await knex.schema.alterTable('payment_transactions', (table) => {
    table.string('fawry_reference', 100).nullable();
    table.string('instapay_reference', 100).nullable();
    table.string('eta_status', 20).nullable();
    table.string('bank_transfer_ref', 100).nullable();
    table.string('payment_slip_url', 500).nullable();
  });

  // Seed default expense categories
  const defaultCategories = [
    { code: 'RENT', name: 'Rent & Facilities', type: 'facility' },
    { code: 'SALARIES', name: 'Salaries & Wages', type: 'payroll' },
    { code: 'MED_SUPPLIES', name: 'Medical Supplies', type: 'medical_supply' },
    { code: 'PHARMACY', name: 'Pharmacy Stock', type: 'medical_supply' },
    { code: 'UTILITIES', name: 'Utilities (Elec/Water/Gas)', type: 'operational' },
    { code: 'INTERNET', name: 'Internet & Telecom', type: 'operational' },
    { code: 'MAINTENANCE', name: 'Maintenance & Repairs', type: 'operational' },
    { code: 'MARKETING', name: 'Marketing & Advertising', type: 'marketing' },
    { code: 'INSURANCE', name: 'Insurance Premiums', type: 'operational' },
    { code: 'TAXES', name: 'Taxes & Fees', type: 'admin' },
    { code: 'OFFICE', name: 'Office Supplies', type: 'admin' },
    { code: 'TRANSPORT', name: 'Transportation', type: 'operational' },
    { code: 'PROF_FEES', name: 'Professional Fees', type: 'operational' },
    { code: 'TRAINING', name: 'Training & Development', type: 'admin' },
    { code: 'IT_SERVICES', name: 'IT & Software', type: 'operational' },
    { code: 'OTHER', name: 'Other Expenses', type: 'other' },
  ];

  for (const cat of defaultCategories) {
    await knex('expense_categories').insert({
      tenant_id: null,
      name: cat.name,
      code: cat.code,
      type: cat.type,
      is_active: true,
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('budget_line_items');
  await knex.schema.dropTableIfExists('budget_plans');
  await knex.schema.dropTableIfExists('eta_invoices');
  await knex.schema.dropTableIfExists('expenses');
  await knex.schema.dropTableIfExists('expense_categories');

  await knex.schema.alterTable('payment_transactions', (table) => {
    table.dropColumn('fawry_reference');
    table.dropColumn('instapay_reference');
    table.dropColumn('eta_status');
    table.dropColumn('bank_transfer_ref');
    table.dropColumn('payment_slip_url');
  });
}
