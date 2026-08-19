import type { Knex } from 'knex';

/**
 * Phase 1: Membership table + deny support + active membership pointer.
 *
 * The membership is the authoritative source of a user's organizational context
 * (tenant, branch, department). JWT will carry only the membership reference;
 * all context is resolved server-side from this table.
 *
 * See docs/engineering/AUTHORIZATION-SOUND-OF-TRUTH.md §4.
 */
export async function up(knex: Knex): Promise<void> {
  // ── 1. Memberships table ──
  if (!(await knex.schema.hasTable('memberships'))) {
    await knex.schema.createTable('memberships', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.uuid('tenant_id').notNullable()
        .references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('branch_id').nullable()
        .references('id').inTable('branches').onDelete('SET NULL');
      table.uuid('department_id').nullable()
        .references('id').inTable('departments').onDelete('SET NULL');
      table.string('status', 20).notNullable().defaultTo('active');
      table.integer('authz_version').notNullable().defaultTo(1);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'tenant_id', 'branch_id']);
      table.index(['user_id']);
      table.index(['tenant_id']);
      table.index(['status']);
    });
  }

  // ── 2. Backfill memberships from existing user-tenant assignments ──
  const users = await knex('users')
    .select('id', 'tenant_id', 'branch_id', 'department_id', 'status', 'perm_version')
    .whereNotNull('tenant_id');

  for (const user of users) {
    const exists = await knex('memberships')
      .where({
        user_id: user.id,
        tenant_id: user.tenant_id,
        branch_id: user.branch_id || null,
      })
      .first();
    if (!exists) {
      await knex('memberships').insert({
        user_id: user.id,
        tenant_id: user.tenant_id,
        branch_id: user.branch_id || null,
        department_id: user.department_id || null,
        status: user.status || 'active',
        authz_version: user.perm_version || 1,
      });
    }
  }

  // ── 3. Add 'type' column to user_permissions for allow/deny ──
  if (!(await knex.schema.hasColumn('user_permissions', 'type'))) {
    await knex.schema.alterTable('user_permissions', (table) => {
      table.string('type', 10).notNullable().defaultTo('allow');
    });
  }

  // ── 4. Add active_membership_id to users for quick lookup ──
  if (!(await knex.schema.hasColumn('users', 'active_membership_id'))) {
    await knex.schema.alterTable('users', (table) => {
      table.uuid('active_membership_id').nullable()
        .references('id').inTable('memberships').onDelete('SET NULL');
    });

    // Backfill: set active_membership_id to the first (or only) membership per user
    const memberships = await knex('memberships')
      .select('id', 'user_id')
      .orderBy('created_at', 'asc');

    const seen = new Set<string>();
    for (const m of memberships) {
      if (seen.has(m.user_id)) continue;
      seen.add(m.user_id);
      await knex('users')
        .where({ id: m.user_id })
        .update({ active_membership_id: m.id });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('active_membership_id');
  });
  await knex.schema.alterTable('user_permissions', (table) => {
    table.dropColumn('type');
  });
  await knex.schema.dropTableIfExists('memberships');
}
