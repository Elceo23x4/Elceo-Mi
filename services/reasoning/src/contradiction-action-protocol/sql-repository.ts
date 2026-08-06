import { canonicalJson } from '../expectation-reality/identity';
import type { ProtocolAuditRecord } from './contracts';
import { assertSupersession, type ContradictionActionProtocolRepository } from './repository';

type QueryResult = { rows: unknown[]; rowCount?: number };
type ClientLike = { query(sql: string, params?: unknown[]): Promise<QueryResult>; release(): void };
export type ContradictionActionProtocolPool = { connect(): Promise<ClientLike>; query(sql: string, params?: unknown[]): Promise<QueryResult> };
const payload = (row: unknown): ProtocolAuditRecord => { const value = (row as { canonical_payload: unknown }).canonical_payload; return (typeof value === 'string' ? JSON.parse(value) : value) as ProtocolAuditRecord; };
const count = (result: QueryResult): number => result.rowCount ?? result.rows.length;

export class SqlContradictionActionProtocolRepository implements ContradictionActionProtocolRepository {
  constructor(private readonly pool: ContradictionActionProtocolPool) {}

  async saveProtocolRecord(record: ProtocolAuditRecord): Promise<ProtocolAuditRecord> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query('SELECT canonical_payload FROM contradiction_action_protocol_records WHERE protocol_decision_id=$1 FOR UPDATE', [record.protocolDecisionId]);
      if (count(existing)) {
        const canonical = payload(existing.rows[0]);
        if (canonicalJson(canonical) !== canonicalJson(record)) throw new Error('immutable_protocol_record_conflict');
        await client.query('COMMIT');
        return canonical;
      }
      if (record.previousDecision) {
        const previousResult = await client.query('SELECT canonical_payload FROM contradiction_action_protocol_records WHERE protocol_decision_id=$1 FOR UPDATE', [record.previousDecision.previousProtocolDecisionId]);
        if (!count(previousResult)) throw new Error('previous_protocol_decision_missing');
        assertSupersession(payload(previousResult.rows[0]), record);
        const cycle = await client.query('WITH RECURSIVE chain AS (SELECT previous_protocol_decision_id,next_protocol_decision_id FROM contradiction_action_protocol_transitions WHERE next_protocol_decision_id=$1 UNION ALL SELECT t.previous_protocol_decision_id,t.next_protocol_decision_id FROM contradiction_action_protocol_transitions t JOIN chain c ON t.next_protocol_decision_id=c.previous_protocol_decision_id) SELECT 1 FROM chain WHERE previous_protocol_decision_id=$2 LIMIT 1', [record.previousDecision.previousProtocolDecisionId, record.protocolDecisionId]);
        if (count(cycle)) throw new Error('protocol_supersession_cycle');
      }
      await client.query('INSERT INTO contradiction_action_protocol_records(protocol_decision_id,policy_version,source_event_evaluation_id,source_expectation_id,source_analog_retrieval_id,source_asset,source_release_id,source_release_version,source_assessment_stage,source_assessment_stage_order,event_instance_key,contradiction_evidence_hash,invalidation_state_hash,analog_context_hash,evidence_cutoff_at,evidence_sufficiency,protocol_state,transition_reasons,warnings,limitations,canonical_payload,canonical_payload_hash,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)', [record.protocolDecisionId,record.policyVersion,record.sourceEventEvaluationId,record.sourceExpectationId,record.sourceAnalogRetrievalId,record.sourceAsset,record.sourceReleaseId,record.sourceReleaseVersion,record.sourceAssessmentStage,record.sourceAssessmentStageOrder,record.eventInstanceKey,record.contradictionEvidenceHash,record.invalidationStateHash,record.analogContextHash,record.evidenceCutoffAt,record.evidenceSufficiency,record.protocolState,record.transitionReasons,record.warnings,record.limitations,JSON.stringify(record),record.canonicalPayloadHash,record.createdAt]);
      for (const ref of record.sourceEvidenceReferences) await client.query('INSERT INTO contradiction_action_protocol_evidence_refs(protocol_decision_id,source_type,source_id,content_hash,observed_at,reliability) VALUES($1,$2,$3,$4,$5,$6)', [record.protocolDecisionId,ref.sourceType,ref.sourceId,ref.contentHash,ref.observedAt,ref.reliability]);
      if (record.previousDecision) await client.query('INSERT INTO contradiction_action_protocol_transitions(transition_id,previous_protocol_decision_id,next_protocol_decision_id,supersedes) VALUES($1,$2,$3,TRUE)', [record.previousDecision.transitionId,record.previousDecision.previousProtocolDecisionId,record.protocolDecisionId]);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      const raced = await client.query('SELECT canonical_payload FROM contradiction_action_protocol_records WHERE protocol_decision_id=$1', [record.protocolDecisionId]);
      if (count(raced)) {
        const canonical = payload(raced.rows[0]);
        if (canonicalJson(canonical) === canonicalJson(record)) return canonical;
        throw new Error('immutable_protocol_record_conflict');
      }
      throw error;
    } finally { client.release(); }
  }

  async getProtocolRecordById(id: string): Promise<ProtocolAuditRecord | null> { const result = await this.pool.query('SELECT canonical_payload FROM contradiction_action_protocol_records WHERE protocol_decision_id=$1', [id]); return count(result) ? payload(result.rows[0]) : null; }
  async listProtocolRecordsForEvent(eventEvaluationId: string): Promise<ProtocolAuditRecord[]> { const result = await this.pool.query('SELECT canonical_payload FROM contradiction_action_protocol_records WHERE source_event_evaluation_id=$1 ORDER BY created_at,protocol_decision_id', [eventEvaluationId]); return result.rows.map(payload); }
}
