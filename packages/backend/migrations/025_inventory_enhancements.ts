import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── #7: Suppliers table ──
  if (!(await knex.schema.hasTable('suppliers'))) {
    await knex.schema.createTable('suppliers', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.string('name', 200).notNullable();
      table.string('code', 50).notNullable();
      table.string('contact_person', 200).nullable();
      table.string('email', 255).nullable();
      table.string('phone', 20).nullable();
      table.text('address').nullable();
      table.string('tax_id', 100).nullable();
      table.string('payment_terms', 100).nullable();
      table.decimal('credit_limit', 12, 2).defaultTo(0);
      table.string('status', 20).defaultTo('active');
      table.text('notes').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'code']);
    });
  }

  // ── #9: Barcode + QR code fields on inventory_items ──
  const hasBarcode = await knex.schema.hasColumn('inventory_items', 'barcode');
  if (!hasBarcode) {
    await knex.schema.alterTable('inventory_items', (table) => {
      table.string('barcode', 100).nullable();
      table.string('qr_code', 500).nullable();
      table.index('barcode');
    });
  }

  // ── #11: Controlled substance classification ──
  const hasControlledClass = await knex.schema.hasColumn('inventory_items', 'controlled_substance_class');
  if (!hasControlledClass) {
    await knex.schema.alterTable('inventory_items', (table) => {
      table.string('controlled_substance_class', 20).nullable(); // none, I, II, III, IV, V
    });
  }

  // ── #13: Reason code column on inventory_transactions ──
  const hasReason = await knex.schema.hasColumn('inventory_transactions', 'reason_code');
  if (!hasReason) {
    await knex.schema.alterTable('inventory_transactions', (table) => {
      table.string('reason_code', 50).nullable();
      table.integer('unit_cost').defaultTo(0);
    });
  }

  // ── #7: Add supplier_id FK to inventory_items ──
  const hasSupplierId = await knex.schema.hasColumn('inventory_items', 'supplier_id');
  if (!hasSupplierId) {
    await knex.schema.alterTable('inventory_items', (table) => {
      table.uuid('supplier_id').references('id').inTable('suppliers').nullable();
    });
  }

  // ── #10: Add transfer tracking columns ──
  const hasFromWarehouse = await knex.schema.hasColumn('inventory_transactions', 'from_warehouse_id');
  if (!hasFromWarehouse) {
    await knex.schema.alterTable('inventory_transactions', (table) => {
      table.uuid('from_warehouse_id').references('id').inTable('warehouses').nullable();
      table.uuid('to_warehouse_id').references('id').inTable('warehouses').nullable();
    });
  }

  // ── #12: Add batch cost tracking for valuation ──
  const hasUnitCostTx = await knex.schema.hasColumn('inventory_transactions', 'unit_cost');
  if (!hasUnitCostTx) {
    await knex.schema.alterTable('inventory_transactions', (table) => {
      table.decimal('unit_cost', 12, 2).defaultTo(0);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasFromWarehouse = await knex.schema.hasColumn('inventory_transactions', 'from_warehouse_id');
  if (hasFromWarehouse) {
    await knex.schema.alterTable('inventory_transactions', (table) => {
      table.dropColumn('from_warehouse_id');
      table.dropColumn('to_warehouse_id');
    });
  }

  const hasReason = await knex.schema.hasColumn('inventory_transactions', 'reason_code');
  if (hasReason) {
    await knex.schema.alterTable('inventory_transactions', (table) => {
      table.dropColumn('reason_code');
      table.dropColumn('unit_cost');
    });
  }

  const hasControlledClass = await knex.schema.hasColumn('inventory_items', 'controlled_substance_class');
  if (hasControlledClass) {
    await knex.schema.alterTable('inventory_items', (table) => {
      table.dropColumn('controlled_substance_class');
    });
  }

  const hasBarcode = await knex.schema.hasColumn('inventory_items', 'barcode');
  if (hasBarcode) {
    await knex.schema.alterTable('inventory_items', (table) => {
      table.dropColumn('barcode');
      table.dropColumn('qr_code');
    });
  }

  const hasSupplierId = await knex.schema.hasColumn('inventory_items', 'supplier_id');
  if (hasSupplierId) {
    await knex.schema.alterTable('inventory_items', (table) => {
      table.dropColumn('supplier_id');
    });
  }

  await knex.schema.dropTableIfExists('suppliers');
}
