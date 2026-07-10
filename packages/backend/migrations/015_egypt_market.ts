import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add national ID to patients (Egyptian National ID = 14 digits)
  await knex.schema.alterTable('patients', (table) => {
    table.string('national_id', 20).nullable();
    table.string('national_id_type', 20).defaultTo('national'); // national, passport, gcc
  });

  // Add tax registration to tenants (ETA requirement)
  await knex.schema.alterTable('tenants', (table) => {
    table.string('tax_registration_number', 20).nullable();
    table.string('commercial_registration', 30).nullable();
  });

  // Egypt-specific insurance companies seed data
  const egyptInsurers = [
    { name: 'التأمين الصحي الشامل', code: 'SHI_EG', contract_type: 'government', discount_rate: 100, is_active: true },
    { name: 'الهيئة العامة للتأمين الصحي', code: 'HIO_EG', contract_type: 'government', discount_rate: 80, is_active: true },
    { name: 'أكسا مصر', code: 'AXA_EG', contract_type: 'network', discount_rate: 20, is_active: true },
    { name: 'أليانز مصر', code: 'ALLIANZ_EG', contract_type: 'network', discount_rate: 15, is_active: true },
    { name: 'ميتلايف مصر', code: 'METLIFE_EG', contract_type: 'network', discount_rate: 15, is_active: true },
    { name: 'جيجي مصر', code: 'GIG_EG', contract_type: 'network', discount_rate: 20, is_active: true },
    { name: 'ثري أيه مصر', code: '3A_EG', contract_type: 'network', discount_rate: 10, is_active: true },
    { name: 'المصرية للتأمين', code: 'EIC_EG', contract_type: 'network', discount_rate: 15, is_active: true },
  ];

  // Insert with null tenant_id as global templates
  for (const ins of egyptInsurers) {
    await knex('insurance_companies').insert({
      id: knex.raw('gen_random_uuid()'),
      tenant_id: null,
      name: ins.name,
      code: ins.code,
      contract_type: ins.contract_type,
      discount_rate: ins.discount_rate,
      coverage_plans: JSON.stringify(['outpatient', 'inpatient', 'pharmacy', 'lab', 'radiology']),
      is_active: true,
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('patients', (table) => {
    table.dropColumn('national_id');
    table.dropColumn('national_id_type');
  });
  await knex.schema.alterTable('tenants', (table) => {
    table.dropColumn('tax_registration_number');
    table.dropColumn('commercial_registration');
  });
  await knex('insurance_companies').whereIn('code', ['SHI_EG', 'HIO_EG', 'AXA_EG', 'ALLIANZ_EG', 'METLIFE_EG', 'GIG_EG', '3A_EG', 'EIC_EG']).delete();
}
