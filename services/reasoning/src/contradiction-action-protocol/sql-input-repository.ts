import { canonicalJson } from '../expectation-reality/identity';
import { normalizePersistedContradictionInputRecord, type PersistedContradictionInputRepository } from './input-repository';
import type { PersistedContradictionInputRecord } from './contracts';

export type ContradictionInputQuery = <T extends Record<string,unknown> = Record<string,unknown>>(sql:string, params?:unknown[])=>Promise<T[]>;
export type ContradictionInputTransaction = <T>(fn:(query:ContradictionInputQuery)=>Promise<T>)=>Promise<T>;
const rowPayload=(row:{canonical_payload:unknown}) => (typeof row.canonical_payload==='string'?JSON.parse(row.canonical_payload):row.canonical_payload) as PersistedContradictionInputRecord;

export class SqlPersistedContradictionInputRepository implements PersistedContradictionInputRepository {
  constructor(private readonly query:ContradictionInputQuery, private readonly transaction:ContradictionInputTransaction) {}
  async saveContradictionInput(record:PersistedContradictionInputRecord){ const normalized=normalizePersistedContradictionInputRecord(record); return this.transaction(async(q)=>{
    await q(`INSERT INTO contradiction_action_protocol_inputs(record_id,event_evaluation_id,expectation_id,asset,assessment_stage,assessment_evidence_hash,available_at,evidence_cutoff_at,normalized_input_hash,provider_reliability_supplied,source_independence_verified,provenance_classes,warnings,limitations,canonical_payload,canonical_payload_hash,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (record_id) DO NOTHING`,[normalized.recordId,normalized.eventEvaluationId,normalized.expectationId,normalized.asset,normalized.assessmentStage,normalized.assessmentEvidenceHash,normalized.availableAt,normalized.evidenceCutoffAt,normalized.normalizedInputHash,normalized.providerReliabilitySupplied,normalized.sourceIndependenceVerified,[...new Set(normalized.provenance.map(p=>p.reliability))].sort(),normalized.warnings,normalized.limitations,JSON.stringify(normalized),normalized.canonicalPayloadHash,normalized.createdAt]);
    const rows=await q<{canonical_payload:unknown}>('SELECT canonical_payload FROM contradiction_action_protocol_inputs WHERE record_id=$1 FOR UPDATE',[normalized.recordId]); const existing=rows[0]&&rowPayload(rows[0]);
    if(!existing || canonicalJson(existing)!==canonicalJson(normalized)) throw new Error('immutable_contradiction_input_conflict'); return existing;
  }); }
  async getContradictionInputById(id:string){ const rows=await this.query<{canonical_payload:unknown}>('SELECT canonical_payload FROM contradiction_action_protocol_inputs WHERE record_id=$1',[id]); return rows[0]?rowPayload(rows[0]):null; }
  async getContradictionInputForEvent(eventEvaluationId:string){ const rows=await this.query<{canonical_payload:unknown}>('SELECT canonical_payload FROM contradiction_action_protocol_inputs WHERE event_evaluation_id=$1',[eventEvaluationId]); return rows[0]?rowPayload(rows[0]):null; }
}
