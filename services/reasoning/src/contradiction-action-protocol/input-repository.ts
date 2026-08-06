import { canonicalHash, canonicalJson, deepCloneFreeze } from '../expectation-reality/identity';
import { normalizeContradictionInput } from './identity';
import type { PersistedContradictionInputRecord } from './contracts';

export type PersistedContradictionInputRepository = {
  saveContradictionInput(record: PersistedContradictionInputRecord): Promise<PersistedContradictionInputRecord>;
  getContradictionInputById(recordId: string): Promise<PersistedContradictionInputRecord | null>;
  getContradictionInputForEvent(eventEvaluationId: string): Promise<PersistedContradictionInputRecord | null>;
};

export function normalizePersistedContradictionInputRecord(record: PersistedContradictionInputRecord): PersistedContradictionInputRecord {
  const input = normalizeContradictionInput(record.input);
  const normalizedInputHash = canonicalHash(input);
  const base = { ...record, input, normalizedInputHash, sourceEvidenceIds:[...new Set(record.sourceEvidenceIds)].sort(), provenance:[...record.provenance].sort((a,b)=>canonicalHash(a).localeCompare(canonicalHash(b))), warnings:[...new Set(record.warnings)].sort(), limitations:[...new Set(record.limitations)].sort(), canonicalPayloadHash:'' };
  const recordId = `contradiction-input:${canonicalHash({ eventEvaluationId:base.eventEvaluationId, expectationId:base.expectationId, asset:base.asset, assessmentStage:base.assessmentStage, assessmentEvidenceHash:base.assessmentEvidenceHash, evidenceCutoffAt:base.evidenceCutoffAt, availableAt:base.availableAt, input, sourceEvidenceIds:base.sourceEvidenceIds, provenance:base.provenance, providerReliabilitySupplied:base.providerReliabilitySupplied, sourceIndependenceVerified:base.sourceIndependenceVerified, warnings:base.warnings, limitations:base.limitations })}`;
  const canonicalPayloadHash = canonicalHash({ ...base, recordId, canonicalPayloadHash:undefined });
  return { ...base, recordId, canonicalPayloadHash };
}

export class MemoryPersistedContradictionInputRepository implements PersistedContradictionInputRepository {
  private readonly rows = new Map<string, PersistedContradictionInputRecord>();
  async saveContradictionInput(record: PersistedContradictionInputRecord): Promise<PersistedContradictionInputRecord> {
    const normalized=normalizePersistedContradictionInputRecord(record); const existing=this.rows.get(normalized.recordId);
    if(existing){ if(canonicalJson(existing)!==canonicalJson(normalized)) throw new Error('immutable_contradiction_input_conflict'); return existing; }
    const eventExisting=[...this.rows.values()].find((row)=>row.eventEvaluationId===normalized.eventEvaluationId);
    if(eventExisting && canonicalJson(eventExisting)!==canonicalJson(normalized)) throw new Error('event_contradiction_input_conflict');
    const frozen=deepCloneFreeze(normalized); this.rows.set(normalized.recordId,frozen); return frozen;
  }
  async getContradictionInputById(id:string){ return this.rows.get(id) ?? null; }
  async getContradictionInputForEvent(eventEvaluationId:string){ return [...this.rows.values()].find((row)=>row.eventEvaluationId===eventEvaluationId) ?? null; }
}
