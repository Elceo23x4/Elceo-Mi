import 'server-only';

import type { CommercialPaymentReadinessCheck, CommercialProfileSocialIdentifier } from '@elceo/types';
import { validateCommercialProfileSocialIdentifier } from '@elceo/schemas';

const memory = new Map<string, { linkedin: string | null; telegram: string | null; x: string | null; updatedAt: string }>();

const env = () => (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const guard = (identifiers: CommercialProfileSocialIdentifier[]): CommercialPaymentReadinessCheck => {
  const normalized: CommercialProfileSocialIdentifier[] = [];
  for (const id of identifiers) {
    const checked = validateCommercialProfileSocialIdentifier(id);
    if (checked.ok) normalized.push(checked.value);
  }
  return normalized.length > 0 ? { status: 'eligible', reason: 'ready', normalizedIdentifiers: normalized } : { status: 'blocked', reason: 'missing_social_identifier', normalizedIdentifiers: [] };
};

async function queryDb<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const module = await import('pg');
  const pool = new module.Pool({ connectionString: env().DATABASE_URL });
  const res = await pool.query(sql, params);
  await pool.end();
  return res.rows as T[];
}

function toIds(row: { linkedin: string | null; telegram: string | null; x: string | null }): CommercialProfileSocialIdentifier[] {
  const out: CommercialProfileSocialIdentifier[] = [];
  if (row.linkedin) out.push({ kind: 'linkedin_address', value: row.linkedin });
  if (row.telegram) out.push({ kind: 'telegram_id', value: row.telegram });
  if (row.x) out.push({ kind: 'x_username', value: row.x });
  return out;
}

export async function getUserSocialIdentifiers(userId: string) {
  const useSql = env().APP_STATE_REPOSITORY === 'sql' && !!env().DATABASE_URL;
  if (useSql) {
    const row = (await queryDb<{ linkedin_address: string | null; telegram_id: string | null; x_username: string | null; updated_at: string }>('SELECT linkedin_address, telegram_id, x_username, updated_at FROM app_user_social_identifiers WHERE user_id=$1 LIMIT 1', [userId]))[0];
    const identifiers = row ? toIds({ linkedin: row.linkedin_address, telegram: row.telegram_id, x: row.x_username }) : [];
    const paymentReadiness = guard(identifiers);
    return { userId, socialIdentifiers: paymentReadiness.normalizedIdentifiers, paymentReadiness, updatedAt: row?.updated_at ?? new Date(0).toISOString(), persistenceStatus: 'durable' as const };
  }
  const row = memory.get(userId);
  const ids = row ? toIds(row) : [];
  const paymentReadiness = guard(ids);
  return { userId, socialIdentifiers: paymentReadiness.normalizedIdentifiers, paymentReadiness, updatedAt: row?.updatedAt ?? new Date(0).toISOString(), persistenceStatus: 'memory_fallback' as const };
}

export async function setUserSocialIdentifiers(userId: string, identifiers: CommercialProfileSocialIdentifier[]) {
  const now = new Date().toISOString();
  const linkedin = identifiers.find((v) => v.kind === 'linkedin_address')?.value ?? null;
  const telegram = identifiers.find((v) => v.kind === 'telegram_id')?.value ?? null;
  const x = identifiers.find((v) => v.kind === 'x_username')?.value ?? null;
  const useSql = env().APP_STATE_REPOSITORY === 'sql' && !!env().DATABASE_URL;
  if (useSql) {
    await queryDb('INSERT INTO app_user_social_identifiers (user_id, linkedin_address, telegram_id, x_username, readiness_status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id) DO UPDATE SET linkedin_address=EXCLUDED.linkedin_address, telegram_id=EXCLUDED.telegram_id, x_username=EXCLUDED.x_username, readiness_status=EXCLUDED.readiness_status, updated_at=EXCLUDED.updated_at', [userId, linkedin, telegram, x, identifiers.length > 0 ? 'eligible' : 'blocked', now, now]);
  } else {
    memory.set(userId, { linkedin, telegram, x, updatedAt: now });
  }
  return getUserSocialIdentifiers(userId);
}

export function clearUserSocialIdentifiersStore(): void { memory.clear(); }
