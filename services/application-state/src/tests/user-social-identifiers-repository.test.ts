import assert from 'node:assert/strict';
import { __setDbPoolFactoryForTests, closeDbPool } from '../db/client';
import { CommercialPersistenceError } from '../persistence/commercial-persistence-error';
import { SQLUserSocialIdentifiersRepository, buildDefaultUserSocialIdentifiersRepository } from '../persistence/user-social-identifiers-repository';

export async function runUserSocialIdentifiersRepositoryTests() {
  const rows = new Map<string, any>(); let fail = false; const queries: string[] = [];
  __setDbPoolFactoryForTests(() => ({ query: async (sql: string, params?: unknown[]) => { queries.push(sql); if (fail) throw new Error('relation missing password=secret'); if (sql.startsWith('SELECT user_id') && sql.includes('WHERE user_id')) return { rows: rows.has(params![0] as string) ? [rows.get(params![0] as string)] : [] }; if (sql.startsWith('INSERT INTO app_user_social_identifiers')) { rows.set(params![0] as string, { user_id: params![0], linkedin_address: params![1], telegram_id: params![2], x_username: params![3], updated_at: params![6] }); return { rows: [] }; } return { rows: [] }; }, connect: async () => { throw new Error('unused'); }, end: async () => undefined }));
  const repo = new SQLUserSocialIdentifiersRepository(); rows.set('u1', { user_id: 'u1', linkedin_address: 'https://linkedin.com/in/a', telegram_id: null, x_username: null, updated_at: '2026-01-01T00:00:00.000Z' });
  assert.equal((await repo.get('u1')).paymentReadiness.status, 'eligible', 'SQL existing row read is eligible');
  const missing = await repo.get('missing'); assert.equal(missing.persistenceStatus, 'durable'); assert.equal(missing.paymentReadiness.reason, 'missing_social_identifier', 'SQL missing row returns durable blocked readiness');
  await repo.upsert('u2', [{ kind: 'telegram_id', value: 'elceo' }]); assert.equal((await repo.get('u2')).socialIdentifiers[0]?.kind, 'telegram_id', 'SQL upsert then read works');
  fail = true; await assert.rejects(() => repo.get('u1'), CommercialPersistenceError, 'SQL failure throws typed error and does not fallback'); assert.equal((await repo.getPersistenceReadiness()).persistenceStatus, 'unavailable', 'readiness reports unavailable on SQL failure');
  assert.ok(queries.some((sql) => sql.includes('readiness_status') && sql.includes('created_at') && sql.includes('updated_at')), 'readiness probes exact social columns');
  const env = process.env; const old = { NODE_ENV: env.NODE_ENV, APP_STATE_REPOSITORY: env.APP_STATE_REPOSITORY, DATABASE_URL: env.DATABASE_URL }; env.NODE_ENV = 'production'; env.APP_STATE_REPOSITORY = 'memory'; delete env.DATABASE_URL; assert.throws(() => buildDefaultUserSocialIdentifiersRepository(), CommercialPersistenceError, 'production invalid configuration fails closed'); Object.assign(env, old);
  await closeDbPool(); __setDbPoolFactoryForTests(null);
}
