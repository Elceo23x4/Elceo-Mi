import { canonicalJson } from '../expectation-reality/identity';
import type { SqlPool } from '../market-cleanliness/sql-context-repository';
import type {
  AcceptanceBundle,
  AcceptanceEntityMap,
  AcceptanceRecordKind,
  HoldoutLifecycle,
} from './contracts';
import type { IntelligenceAcceptanceRepository } from './repository';
import { canonicalHash } from './identity';
const payload = <K extends AcceptanceRecordKind>(row: { canonical_payload: unknown }) =>
  (typeof row.canonical_payload === 'string'
    ? JSON.parse(row.canonical_payload)
    : row.canonical_payload) as AcceptanceEntityMap[K];
export class SqlIntelligenceAcceptanceRepository implements IntelligenceAcceptanceRepository {
  constructor(private readonly pool: SqlPool) {}
  async save<K extends AcceptanceRecordKind>(kind: K, id: string, value: AcceptanceEntityMap[K]) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const saved = await this.saveWith(client, kind, id, value);
      await client.query('COMMIT');
      return saved;
    } catch (error) {
      await client.query('ROLLBACK');
      const prior = await this.get(kind, id);
      if (prior && canonicalJson(prior) === canonicalJson(value)) return prior;
      throw error;
    } finally {
      client.release();
    }
  }
  private async saveWith<K extends AcceptanceRecordKind>(
    client: {
      query: (
        sql: string,
        args?: unknown[],
      ) => Promise<{ rows: Array<{ canonical_payload: unknown }> }>;
    },
    kind: K,
    id: string,
    value: AcceptanceEntityMap[K],
  ) {
    const found = await client.query(
      'SELECT canonical_payload FROM intelligence_acceptance_records WHERE record_kind=$1 AND record_id=$2 FOR UPDATE',
      [kind, id],
    );
    if (found.rows[0]) {
      const prior = payload<K>(found.rows[0]);
      if (canonicalJson(prior) !== canonicalJson(value))
        throw new Error('immutable_acceptance_conflict');
      return prior;
    }
    await client.query(
      'INSERT INTO intelligence_acceptance_records(record_kind,record_id,canonical_payload,canonical_payload_hash,created_at) VALUES($1,$2,$3,$4,$5)',
      [
        kind,
        id,
        JSON.stringify(value),
        (value as { canonicalPayloadHash: string }).canonicalPayloadHash,
        (
          value as {
            createdAt?: string;
            generatedAt?: string;
            certifiedAt?: string;
            selectedAt?: string;
          }
        ).createdAt ??
          (value as { generatedAt?: string }).generatedAt ??
          (value as { certifiedAt?: string }).certifiedAt ??
          (value as { selectedAt?: string }).selectedAt,
      ],
    );
    return value;
  }
  async get<K extends AcceptanceRecordKind>(kind: K, id: string) {
    const q = await this.pool.query(
      'SELECT canonical_payload FROM intelligence_acceptance_records WHERE record_kind=$1 AND record_id=$2',
      [kind, id],
    );
    return q.rows[0] ? payload<K>(q.rows[0]) : null;
  }
  async freezeCandidate(value: HoldoutLifecycle) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        value.acceptanceRunFamilyId,
      ]);
      const q = await client.query(
        "SELECT canonical_payload FROM intelligence_acceptance_records WHERE record_kind='holdout_lifecycle' AND record_id=$1 FOR UPDATE",
        [value.acceptanceRunFamilyId],
      );
      if (q.rows[0]) {
        const prior = payload<'holdout_lifecycle'>(q.rows[0]);
        if (prior.selectedConfigurationVersionId !== value.selectedConfigurationVersionId)
          throw new Error('candidate_selection_frozen');
        await client.query('COMMIT');
        return prior;
      }
      const saved = await this.saveWith(
        client,
        'holdout_lifecycle',
        value.acceptanceRunFamilyId,
        value,
      );
      await client.query('COMMIT');
      return saved;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  async openHoldout(id: string, openedAt: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const q = await client.query(
        "SELECT canonical_payload FROM intelligence_acceptance_records WHERE record_kind='holdout_lifecycle' AND record_id=$1 FOR UPDATE",
        [id],
      );
      if (!q.rows[0]) throw new Error('candidate_not_frozen');
      const prior = payload<'holdout_lifecycle'>(q.rows[0]);
      if (prior.state !== 'selected') {
        await client.query('COMMIT');
        return prior;
      }
      const base = Object.fromEntries(
        Object.entries(prior).filter(([key]) => key !== 'canonicalPayloadHash'),
      ) as Omit<typeof prior, 'canonicalPayloadHash'>;
      const body = { ...base, state: 'opened' as const, openedAt };
      const next = { ...body, canonicalPayloadHash: canonicalHash(body) };
      await client.query(
        "UPDATE intelligence_acceptance_records SET canonical_payload=$2,canonical_payload_hash=$3 WHERE record_kind='holdout_lifecycle' AND record_id=$1",
        [id, JSON.stringify(next), next.canonicalPayloadHash],
      );
      await client.query('COMMIT');
      return next;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  async saveBundle(bundle: AcceptanceBundle, injectFailureAfter = Number.POSITIVE_INFINITY) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      let count = 0;
      for (const c of bundle.cases) {
        await this.saveWith(client, 'case_result', c.caseResultId, c);
        if (++count === injectFailureAfter) throw new Error('injected_bundle_failure');
      }
      for (const c of bundle.coverage)
        await this.saveWith(client, 'coverage_decision', c.cellId, c);
      for (const r of bundle.risks) await this.saveWith(client, 'residual_risk', r.riskId, r);
      await this.saveWith(
        client,
        'rollback_evidence',
        bundle.rollback.rollbackEvidenceId,
        bundle.rollback,
      );
      await this.saveWith(client, 'acceptance_run', bundle.run.acceptanceRunId, bundle.run);
      for (const link of bundle.referenceLinks)
        await client.query(
          'INSERT INTO intelligence_acceptance_links(acceptance_run_id,record_kind,record_id,created_at) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
          [bundle.run.acceptanceRunId, link.kind, link.id, bundle.run.createdAt],
        );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  async listLinks(runId: string) {
    const q = await this.pool.query(
      'SELECT record_kind,record_id FROM intelligence_acceptance_links WHERE acceptance_run_id=$1 ORDER BY record_kind,record_id',
      [runId],
    );
    return q.rows.map((r: { record_kind: AcceptanceRecordKind; record_id: string }) => ({
      kind: r.record_kind,
      id: r.record_id,
    }));
  }
}
