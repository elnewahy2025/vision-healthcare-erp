import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── #4: Unique partial index to prevent double booking at DB level ──
  // Prevents the same doctor from having two non-cancelled appointments
  // at the exact same date+time within the same tenant.
  const hasConflictIdx = await knex.raw(
    "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_doctor_unique_slot'"
  );
  if (!hasConflictIdx?.rows?.length) {
    await knex.raw(`
      CREATE UNIQUE INDEX idx_appointments_doctor_unique_slot
      ON appointments (doctor_id, tenant_id, appointment_date, start_time)
      WHERE status NOT IN ('cancelled', 'no_show')
    `);
  }

  // ── #9: Add timezone column to appointments ──
  const hasTimezoneCol = await knex.schema.hasColumn('appointments', 'timezone');
  if (!hasTimezoneCol) {
    await knex.schema.alterTable('appointments', (table) => {
      table.string('timezone', 50).defaultTo('Africa/Cairo');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS idx_appointments_doctor_unique_slot');
  const hasTimezoneCol = await knex.schema.hasColumn('appointments', 'timezone');
  if (hasTimezoneCol) {
    await knex.schema.alterTable('appointments', (table) => {
      table.dropColumn('timezone');
    });
  }
}
