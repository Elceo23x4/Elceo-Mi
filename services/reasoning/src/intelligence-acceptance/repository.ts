import { canonicalJson, deepCloneFreeze } from '../expectation-reality/identity';
import type {
  AcceptanceBundle,
  AcceptanceEntityMap,
  AcceptanceRecordKind,
  HoldoutLifecycle,
} from './contracts';
export interface IntelligenceAcceptanceRepository {
  save<K extends AcceptanceRecordKind>(
    kind: K,
    id: string,
    value: AcceptanceEntityMap[K],
  ): Promise<AcceptanceEntityMap[K]>;
  get<K extends AcceptanceRecordKind>(kind: K, id: string): Promise<AcceptanceEntityMap[K] | null>;
  freezeCandidate(value: HoldoutLifecycle): Promise<HoldoutLifecycle>;
  openHoldout(runFamilyId: string, openedAt: string): Promise<HoldoutLifecycle>;
  saveBundle(bundle: AcceptanceBundle, injectFailureAfter?: number): Promise<void>;
  listLinks(runId: string): Promise<readonly { kind: AcceptanceRecordKind; id: string }[]>;
}
export class MemoryIntelligenceAcceptanceRepository implements IntelligenceAcceptanceRepository {
  private rows = new Map<string, unknown>();
  private links = new Map<string, readonly { kind: AcceptanceRecordKind; id: string }[]>();
  async save<K extends AcceptanceRecordKind>(
    kind: K,
    id: string,
    value: AcceptanceEntityMap[K],
  ): Promise<AcceptanceEntityMap[K]> {
    const key = `${kind}:${id}`,
      prior = this.rows.get(key);
    if (prior && canonicalJson(prior) !== canonicalJson(value))
      throw new Error('immutable_acceptance_conflict');
    if (prior) return prior as AcceptanceEntityMap[K];
    const frozen = deepCloneFreeze(value);
    this.rows.set(key, frozen);
    return frozen;
  }
  async get<K extends AcceptanceRecordKind>(kind: K, id: string) {
    return (this.rows.get(`${kind}:${id}`) as AcceptanceEntityMap[K] | undefined) ?? null;
  }
  async freezeCandidate(value: HoldoutLifecycle) {
    const prior = await this.get('holdout_lifecycle', value.acceptanceRunFamilyId);
    if (prior && prior.selectedConfigurationVersionId !== value.selectedConfigurationVersionId)
      throw new Error('candidate_selection_frozen');
    return this.save('holdout_lifecycle', value.acceptanceRunFamilyId, prior ?? value);
  }
  async openHoldout(id: string, openedAt: string) {
    const prior = await this.get('holdout_lifecycle', id);
    if (!prior) throw new Error('candidate_not_frozen');
    if (prior.state !== 'selected') return prior;
    const body = { ...prior, state: 'opened' as const, openedAt };
    const canonical = Object.fromEntries(
      Object.entries(body).filter(([key]) => key !== 'canonicalPayloadHash'),
    ) as Omit<typeof body, 'canonicalPayloadHash'>;
    const next = deepCloneFreeze({
      ...canonical,
      canonicalPayloadHash: (await import('./identity')).canonicalHash(canonical),
    });
    this.rows.set(`holdout_lifecycle:${id}`, next);
    return next;
  }
  async saveBundle(bundle: AcceptanceBundle, injectFailureAfter = Number.POSITIVE_INFINITY) {
    const snapshot = new Map(this.rows),
      priorLinks = new Map(this.links);
    try {
      let count = 0;
      for (const c of bundle.cases) {
        await this.save('case_result', c.caseResultId, c);
        if (++count === injectFailureAfter) throw new Error('injected_bundle_failure');
      }
      for (const c of bundle.coverage) await this.save('coverage_decision', c.cellId, c);
      for (const r of bundle.risks) await this.save('residual_risk', r.riskId, r);
      await this.save('rollback_evidence', bundle.rollback.rollbackEvidenceId, bundle.rollback);
      await this.save('acceptance_run', bundle.run.acceptanceRunId, bundle.run);
      this.links.set(bundle.run.acceptanceRunId, deepCloneFreeze(bundle.referenceLinks));
    } catch (error) {
      this.rows = snapshot;
      this.links = priorLinks;
      throw error;
    }
  }
  async listLinks(runId: string) {
    return this.links.get(runId) ?? [];
  }
}
