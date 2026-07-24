import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Fix audit_logs schema mismatch between 001_initial_schema and audit.ts code
  // Migration 001 created: entity(string NOT NULL), entity_id(string), changes(jsonb), ip(string), timestamp
  // Code (audit.ts) writes: entity_type(string), entity_id(uuid), metadata(jsonb), ip_address(string), created_at
  // Migration 012 tried to recreate but hasTable guard skipped it

  const hasTable = await knex.schema.hasTable('audit_logs');
  if (!hasTable) return;

  const columns = await knex.raw("SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_logs'");
  const existingCols = columns.rows.map((r: { column_name: string }) => r.column_name);

  // Add columns that code expects but table doesn't have
  if (!existingCols.includes('entity_type')) {
    await knex.schema.alterTable('audit_logs', (table) => {
      table.string('entity_type', 50).nullable();
    });
  }

  if (!existingCols.includes('metadata')) {
    await knex.schema.alterTable('audit_logs', (table) => {
      table.jsonb('metadata').nullable();
    });
  }

  if (!existingCols.includes('ip_address')) {
    await knex.schema.alterTable('audit_logs', (table) => {
      table.string('ip_address', 45).nullable();
    });
  }

  if (!existingCols.includes('created_at')) {
    await knex.schema.alterTable('audit_logs', (table) => {
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  // Make 'entity' nullable if it exists and is NOT NULL (code doesn't set it)
  if (existingCols.includes('entity')) {
    await knex.raw('ALTER TABLE audit_logs ALTER COLUMN entity DROP NOT NULL');
  }

  // Migrate data from old columns to new columns
  if (existingCols.includes('entity') && existingCols.includes('entity_type')) {
    await knex.raw("UPDATE audit_logs SET entity_type = entity WHERE entity_type IS NULL AND entity IS NOT NULL");
  }
  if (existingCols.includes('changes') && existingCols.includes('metadata')) {
    await knex.raw("UPDATE audit_logs SET metadata = changes WHERE metadata IS NULL AND changes IS NOT NULL");
  }
  if (existingCols.includes('ip') && existingCols.includes('ip_address')) {
    await knex.raw("UPDATE audit_logs SET ip_address = ip WHERE ip_address IS NULL AND ip IS NOT NULL");
  }
  if (existingCols.includes('timestamp') && existingCols.includes('created_at')) {
    await knex.raw("UPDATE audit_logs SET created_at = timestamp WHERE created_at IS NULL");
  }

  // Add index on created_at for time-based queries
  const hasCreatedAtIndex = await knex.raw(
    "SELECT indexname FROM pg_indexes WHERE tablename = 'audit_logs' AND indexname LIKE '%created_at%'"
  );
  if (hasCreatedAtIndex.rows.length === 0) {
    await knex.schema.alterTable('audit_logs', (table) => {
      table.index(['tenant_id', 'created_at']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // This migration only adds columns — down would remove them
  // but we keep old columns for backward compatibility
}
