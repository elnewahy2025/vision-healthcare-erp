import knex from 'knex';
import { getEnv } from '@healthcare/shared/config';

const env = getEnv();

export const db = knex({
  client: 'pg',
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: 2,
    max: 10,
  },
  searchPath: ['public'],
});

export async function withTenant<T>(
  tenantId: string,
  fn: (trx: knex.Knex.Transaction) => Promise<T>,
): Promise<T> {
  const trx = await db.transaction();
  try {
    await trx.raw('SET session_config.tenant_id = ?', [tenantId]);
    const result = await fn(trx);
    await trx.commit();
    return result;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}
