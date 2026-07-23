import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── #7: Enable pg_trgm for trigram-based search ──
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');

  // ── #4: Enable Row Level Security on patients table ──
  await knex.raw('ALTER TABLE patients ENABLE ROW LEVEL SECURITY');

  // RLS policy: tenant isolation
  // Requires setting app.current_tenant on each connection before queries
  await knex.raw(
    "CREATE POLICY tenant_isolation_patients ON patients " +
    "USING (tenant_id = current_setting('app.current_tenant', true)::uuid)"
  );

  // ── #7: GIN index for trigram search on patient names ──
  const hasTrigramIdx = await knex.raw(
    "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_name_trgm'"
  );
  if (!hasTrigramIdx?.rows?.length) {
    await knex.raw(
      'CREATE INDEX idx_patients_name_trgm ON patients ' +
      'USING GIN (first_name gin_trgm_ops, last_name gin_trgm_ops)'
    );
  }

  // ── #8: Efficient pagination index ──
  const hasPaginationIdx = await knex.raw(
    "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_pagination'"
  );
  if (!hasPaginationIdx?.rows?.length) {
    await knex.raw(
      'CREATE INDEX idx_patients_pagination ON patients(tenant_id, deleted_at, created_at DESC)'
    );
  }

  // ── #14: Auto-update updated_at trigger ──
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql'
  `);

  const hasTrigger = await knex.raw(
    "SELECT 1 FROM pg_trigger WHERE tgname = 'set_patients_updated_at'"
  );
  if (!hasTrigger?.rows?.length) {
    await knex.raw(
      'CREATE TRIGGER set_patients_updated_at ' +
      'BEFORE UPDATE ON patients ' +
      'FOR EACH ROW ' +
      'EXECUTE FUNCTION update_updated_at_column()'
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS set_patients_updated_at ON patients');
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at_column()');
  await knex.raw('DROP INDEX IF EXISTS idx_patients_pagination');
  await knex.raw('DROP INDEX IF EXISTS idx_patients_name_trgm');
  await knex.raw("DROP POLICY IF EXISTS tenant_isolation_patients ON patients");
  await knex.raw('ALTER TABLE patients DISABLE ROW LEVEL SECURITY');
  await knex.raw('DROP EXTENSION IF EXISTS pg_trgm');
}
