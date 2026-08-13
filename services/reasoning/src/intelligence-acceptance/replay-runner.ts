import type { DecisionTimeEvidence, EngineOutputs, EvaluationOutcome } from './contracts';
import { validateDecisionTimeEvidence } from './dataset-policy';
import { canonicalHash } from './identity';
export interface ProductionIfpChain {
  runAndPersist(input: Readonly<Record<string, unknown>>, cutoff: string): Promise<EngineOutputs>;
}
export type FrozenCase = Readonly<{
  caseId: string;
  outputs: EngineOutputs;
  canonicalOutputHash: string;
  persisted: true;
}>;
export class AcceptanceReplayRunner {
  private frozen = new Map<string, FrozenCase>();
  constructor(
    private chain: ProductionIfpChain,
    private persist: (c: FrozenCase) => Promise<void>,
  ) {}
  async run(e: DecisionTimeEvidence) {
    validateDecisionTimeEvidence(e);
    const outputs = await this.chain.runAndPersist(e.productionInput, e.evidenceCutoffAt);
    const c = Object.freeze({
      caseId: e.caseId,
      outputs,
      canonicalOutputHash: canonicalHash(outputs),
      persisted: true as const,
    });
    await this.persist(c);
    this.frozen.set(e.caseId, c);
    return c;
  }
  attachOutcome(outcome: EvaluationOutcome) {
    const c = this.frozen.get(outcome.caseId);
    if (!c) throw new Error('outcome_before_outputs_frozen');
    if (Date.parse(outcome.outcomeAvailableAt) < Date.parse(outcome.measurementEndAt))
      throw new Error('outcome_not_available');
    return Object.freeze({ caseResult: c, outcome });
  }
}
