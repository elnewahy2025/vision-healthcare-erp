import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── #3: Unique partial index on (tenant_id, national_id) where not deleted ──
  // Prevents duplicate patients with same NID under same tenant
  const hasNationalIdIdx = await knex.raw(
    "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_tenant_national_id_unique'"
  );
  if (!hasNationalIdIdx?.rows?.length) {
    await knex.raw(`
      CREATE UNIQUE INDEX idx_patients_tenant_national_id_unique
      ON patients (tenant_id, national_id)
      WHERE national_id IS NOT NULL AND deleted_at IS NULL
    `);
  }

  // ── #3: Unique partial index on (tenant_id, medical_record_number) where not deleted ──
  const hasMrnIdx = await knex.raw(
    "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_patients_tenant_mrn_unique'"
  );
  if (!hasMrnIdx?.rows?.length) {
    await knex.raw(`
      CREATE UNIQUE INDEX idx_patients_tenant_mrn_unique
      ON patients (tenant_id, medical_record_number)
      WHERE deleted_at IS NULL
    `);
  }

  // ── #4: RLS policies that enforce tenant isolation ──
  // Policy: patients can only be accessed by their tenant
  const hasPolicy = await knex.raw(
    "SELECT 1 FROM pg_policies WHERE policyname = 'patients_tenant_isolation' AND tablename = 'patients'"
  );
  if (!hasPolicy?.rows?.length) {
    await knex.raw(`
      CREATE POLICY patients_tenant_isolation ON patients
      FOR ALL
      USING (tenant_id::text = current_setting('app.current_tenant', true))
      WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);
  }

  // ── Force RLS even for table owner (defense in depth) ──
  await knex.raw('ALTER TABLE patients FORCE ROW LEVEL SECURITY');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TABLE patients NO FORCE ROW LEVEL SECURITY');
  await knex.raw('DROP POLICY IF EXISTS patients_tenant_isolation ON patients');
  await knex.raw('DROP INDEX IF EXISTS idx_patients_tenant_mrn_unique');
  await knex.raw('DROP INDEX IF EXISTS idx_patients_tenant_national_id_unique');
}
