import { canonicalJson, deepCloneFreeze } from '../expectation-reality/identity';
import type { HistoricalAnalogRepository, HistoricalAnalogMemoryRecord, HistoricalAnalogRetrievalResult, HistoricalAnalogMatch } from './contracts';
import { isAfterTuple } from './identity';

export class MemoryHistoricalAnalogRepository implements HistoricalAnalogRepository {
  private memory = new Map<string, HistoricalAnalogMemoryRecord>(); private bySource = new Map<string, string>(); private retrievals = new Map<string, HistoricalAnalogRetrievalResult>();
  async saveAnalogMemoryRecord(r: HistoricalAnalogMemoryRecord) { const key=`${r.sourceEventEvaluationId}|${r.featurePolicyVersion}`; const priorId=this.bySource.get(key); const existing=priorId ? this.memory.get(priorId) : this.memory.get(r.analogMemoryId); if (existing) { if (canonicalJson(existing)!==canonicalJson(r)) throw new Error('immutable_analog_memory_conflict'); return existing; } const frozen=deepCloneFreeze(r); this.memory.set(r.analogMemoryId,frozen); this.bySource.set(key,r.analogMemoryId); return frozen; }
  async getAnalogMemoryById(id: string) { return this.memory.get(id) ?? null; }
  async getAnalogMemoryBySource(sourceEventEvaluationId: string, featurePolicyVersion: string) { const id=this.bySource.get(`${sourceEventEvaluationId}|${featurePolicyVersion}`); return id ? this.memory.get(id) ?? null : null; }
  async listAnalogMemory(params: { before: string; asset?: any; limit?: number; cursor?: string }) { let rows=[...this.memory.values()].filter((r)=>Date.parse(r.availableAt)<Date.parse(params.before)); if(params.asset) rows=rows.filter((r)=>r.sourceAsset===params.asset); rows.sort((a,b)=>a.availableAt.localeCompare(b.availableAt)||a.analogMemoryId.localeCompare(b.analogMemoryId)); rows=rows.filter((r)=>isAfterTuple({at:r.availableAt,id:r.analogMemoryId}, params.cursor)); return rows.slice(0, params.limit ?? 100); }
  async saveRetrievalResult(r: HistoricalAnalogRetrievalResult) { const existing=this.retrievals.get(r.retrievalId); if(existing){ if(canonicalJson(existing)!==canonicalJson(r)) throw new Error('immutable_analog_retrieval_conflict'); return existing; } const frozen=deepCloneFreeze(r); this.retrievals.set(r.retrievalId,frozen); return frozen; }
  async getRetrievalById(id: string) { return this.retrievals.get(id) ?? null; }
  async listRetrievalMatches(retrievalId: string): Promise<HistoricalAnalogMatch[]> { return this.retrievals.get(retrievalId)?.matches ?? []; }
}
