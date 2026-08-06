import { canonicalJson, deepCloneFreeze } from '../expectation-reality/identity';
import type { ProtocolAuditRecord } from './contracts';

export type ContradictionActionProtocolRepository = {
  saveProtocolRecord(record: ProtocolAuditRecord): Promise<ProtocolAuditRecord>;
  getProtocolRecordById(id: string): Promise<ProtocolAuditRecord | null>;
  listProtocolRecordsForEvent(eventEvaluationId: string): Promise<ProtocolAuditRecord[]>;
  listProtocolRecordsForEventInstance(eventInstanceKey:string):Promise<ProtocolAuditRecord[]>;
};

export function assertSupersession(previous: ProtocolAuditRecord, next: ProtocolAuditRecord): void {
  if (previous.sourceExpectationId !== next.sourceExpectationId) throw new Error('cross_expectation_supersession_rejected');
  if (previous.sourceReleaseId !== next.sourceReleaseId) throw new Error('cross_release_supersession_rejected');
  if (previous.sourceReleaseVersion !== next.sourceReleaseVersion) throw new Error('cross_release_version_supersession_rejected');
  if (previous.sourceAsset !== next.sourceAsset || previous.eventInstanceKey !== next.eventInstanceKey) throw new Error('cross_event_supersession_rejected');
  if (next.sourceAssessmentStageOrder <= previous.sourceAssessmentStageOrder) throw new Error('evidence_stage_regression');
}

export class MemoryContradictionActionProtocolRepository implements ContradictionActionProtocolRepository {
  private readonly rows = new Map<string, ProtocolAuditRecord>();

  async saveProtocolRecord(record: ProtocolAuditRecord): Promise<ProtocolAuditRecord> {
    const existing = this.rows.get(record.protocolDecisionId);
    if (existing) {
      if (canonicalJson(existing) !== canonicalJson(record)) throw new Error('immutable_protocol_record_conflict');
      return existing;
    }
    if (record.previousDecision) {
      const previous = this.rows.get(record.previousDecision.previousProtocolDecisionId);
      if (!previous) throw new Error('previous_protocol_decision_missing');
      assertSupersession(previous, record);
      if([...this.rows.values()].some((row)=>row.previousDecision?.previousProtocolDecisionId===previous.protocolDecisionId)) throw new Error('protocol_supersession_fork');
      const seen = new Set([record.protocolDecisionId]);
      let cursor: ProtocolAuditRecord | undefined = previous;
      while (cursor) {
        if (seen.has(cursor.protocolDecisionId)) throw new Error('protocol_supersession_cycle');
        seen.add(cursor.protocolDecisionId);
        cursor = cursor.previousDecision ? this.rows.get(cursor.previousDecision.previousProtocolDecisionId) : undefined;
      }
    }
    const frozen = deepCloneFreeze(record);
    this.rows.set(record.protocolDecisionId, frozen);
    return frozen;
  }

  async getProtocolRecordById(id: string): Promise<ProtocolAuditRecord | null> { return this.rows.get(id) ?? null; }
  async listProtocolRecordsForEvent(eventEvaluationId: string): Promise<ProtocolAuditRecord[]> { return [...this.rows.values()].filter((record) => record.sourceEventEvaluationId === eventEvaluationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.protocolDecisionId.localeCompare(b.protocolDecisionId)); }
  async listProtocolRecordsForEventInstance(eventInstanceKey:string){return [...this.rows.values()].filter((record)=>record.eventInstanceKey===eventInstanceKey).sort((a,b)=>a.sourceAssessmentStageOrder-b.sourceAssessmentStageOrder||a.evidenceCutoffAt.localeCompare(b.evidenceCutoffAt)||a.protocolDecisionId.localeCompare(b.protocolDecisionId));}
}
